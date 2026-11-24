import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { readTablet } from "@/lib/tablet";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_LOGIN_SETTINGS } from "@/lib/staff";
import { Logo } from "@/components/logo";
import { NamePicker } from "./name-picker";

export const metadata = { title: "STRATLEARN · Team tablet" };

/** Shared tablet home: find your name, type your PIN. */
export default async function Tablet() {
  const orgId = await readTablet();
  if (!orgId) redirect("/");
  if (await readSession()) redirect("/learn");
  const db = supabaseAdmin();
  const [{ data: org }, { data: people }] = await Promise.all([
    db.from("organizations").select("name, login_settings").eq("id", orgId).maybeSingle(),
    db.from("learners").select("id, display_name").eq("org_id", orgId).eq("is_active", true).order("display_name"),
  ]);
  if (!org || !{ ...DEFAULT_LOGIN_SETTINGS, ...(org.login_settings ?? {}) }.tablet) redirect("/");

  return (
    <main id="main" className="on-dark flex min-h-dvh flex-col">
      <div className="wrap flex flex-1 flex-col gap-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="[&_img]:w-[160px]"><Logo tone="light" /></span>
          <span className="chip">{org.name}</span>
        </div>
        <div>
          <p className="eyebrow">✦ Team tablet</p>
          <h1 className="mt-2 text-5xl sm:text-6xl">Tap <em>your name</em> to start.</h1>
          <p className="mt-2 text-lg">Toca tu nombre para empezar.</p>
        </div>
        <NamePicker people={(people ?? []).map((p) => ({ id: p.id, name: shortName(p.display_name) }))} />
      </div>
    </main>
  );
}

/** "Maria Lopez" -> "Maria L." so full names aren't on show in the break room. */
function shortName(n: string) {
  const parts = n.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}
