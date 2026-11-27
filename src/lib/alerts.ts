import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { sendEmail } from "./email";

/**
 * Error alerts. Every error the app catches is saved in app_errors (Owner portal
 * > Errors). The owner (everyone in platform_admins, or ALERT_EMAIL if set) gets
 * an email the first time each kind of error shows up in an hour, and never more
 * than MAX_ALERTS_PER_DAY alert emails a day, so a bad day can't flood the inbox
 * or use up the email allowance.
 */

export type ErrorSource = "server" | "browser" | "course" | "cron";

const MAX_ALERTS_PER_DAY = 20;
const SITE = process.env.SITE_URL ?? "https://learn.stratlearn.co";

// Fallback when the table isn't there yet: remember recent alerts in this server instance.
const recentlyAlerted = new Map<string, number>();

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

/** Numbers and ids in messages and paths vary; strip them so repeats group together. */
function normalize(s: string) {
  return s
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\d+/g, "#")
    .slice(0, 300);
}

export async function reportError(e: {
  source: ErrorSource;
  message: string;
  path?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const message = clip(e.message || "Unknown error", 2000);
    const path = e.path ? clip(e.path.split("?")[0], 500) : null;
    const signature = `${e.source}:${createHash("sha1").update(`${normalize(message)}|${normalize(path ?? "")}`).digest("hex").slice(0, 16)}`;
    console.error(`[app error] ${e.source} ${path ?? ""} ${message}`);

    const db = supabaseAdmin();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

    let shouldAlert: boolean;
    const { count: sameRecent, error: readError } = await db
      .from("app_errors")
      .select("id", { count: "exact", head: true })
      .eq("signature", signature)
      .eq("alerted", true)
      .gte("created_at", hourAgo);
    if (readError) {
      // Table not set up yet: fall back to this instance's memory.
      const last = recentlyAlerted.get(signature) ?? 0;
      shouldAlert = Date.now() - last > 3_600_000;
    } else {
      const { count: today } = await db
        .from("app_errors")
        .select("id", { count: "exact", head: true })
        .eq("alerted", true)
        .gte("created_at", dayAgo);
      shouldAlert = (sameRecent ?? 0) === 0 && (today ?? 0) < MAX_ALERTS_PER_DAY;
    }

    let alerted = false;
    if (shouldAlert) {
      const to = await alertRecipients();
      if (to.length) {
        recentlyAlerted.set(signature, Date.now());
        const where = path ? ` on ${path}` : "";
        const status = await sendEmail({
          to,
          subject: `LMS error alert: ${LABEL[e.source]}${where}`.slice(0, 150),
          text:
            `${LABEL[e.source]}${where}\n\n${message}\n\n` +
            (e.details ? `Details: ${clip(JSON.stringify(e.details, null, 2), 3000)}\n\n` : "") +
            `Time: ${new Date().toISOString()}\n` +
            `All recent errors: ${SITE}/admin/owner/errors\n\n` +
            `You get one email per kind of error per hour (at most ${MAX_ALERTS_PER_DAY} a day). Repeats are still saved on the Errors page.`,
        });
        alerted = status === "sent";
      }
    }

    if (!readError) {
      await db.from("app_errors").insert({
        source: e.source,
        signature,
        message,
        path,
        details: e.details ?? null,
        alerted,
      });
    }
  } catch (err) {
    // Reporting must never break the page that failed.
    console.error("reportError failed", err);
  }
}

const LABEL: Record<ErrorSource, string> = {
  server: "A page or action failed",
  browser: "A screen crashed on someone's device",
  course: "A course had a script error",
  cron: "The daily reminders job failed",
};

async function alertRecipients(): Promise<string[]> {
  const fixed = (process.env.ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (fixed.length) return fixed;
  const db = supabaseAdmin();
  const { data: admins } = await db.from("platform_admins").select("user_id");
  const emails: string[] = [];
  for (const a of admins ?? []) {
    const { data } = await db.auth.admin.getUserById(a.user_id);
    if (data.user?.email) emails.push(data.user.email);
  }
  return emails;
}
