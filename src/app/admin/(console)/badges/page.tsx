/* eslint-disable @next/next/no-img-element */
import QRCode from "qrcode";
import { requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/origin";
import { PageHead } from "../../ui";
import { FillPins, PrintButton } from "./print-tools";

type Search = Promise<{ ids?: string; role?: string; location?: string }>;

/**
 * Printable sign-in badges: QR code (scan = signed in), team code and
 * sign-in name. PINs are only printed right after they are made (they come
 * in the URL hash from the Add people screen and never reach the server).
 */
export default async function Badges({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const s = await requireStaff();
  const db = supabaseAdmin();
  let q = db
    .from("learners")
    .select("id, display_name, username, qr_token, job_role_id, location_id")
    .eq("org_id", s.org.id)
    .eq("is_active", true)
    .order("display_name");
  const ids = (sp.ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (ids.length) q = q.in("id", ids);
  if (sp.role) q = q.eq("job_role_id", sp.role);
  if (sp.location) q = q.eq("location_id", sp.location);
  const [{ data: people }, { data: roles }, { data: locations }] = await Promise.all([
    q,
    db.from("job_roles").select("id, name").eq("org_id", s.org.id).order("name"),
    db.from("locations").select("id, name").eq("org_id", s.org.id).order("name"),
  ]);
  const origin = await siteOrigin();
  const badges = await Promise.all(
    (people ?? []).map(async (p) => ({
      ...p,
      svg: await QRCode.toString(`${origin}/q/${p.qr_token}`, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#400265", light: "#ffffff" },
      }),
    })),
  );

  return (
    <>
      <div className="print:hidden">
        <PageHead eyebrow="✦ Print badges" title={<>Sign-in <em>badges</em></>}>
          <PrintButton />
        </PageHead>
        <form className="mb-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Role</span>
            <select name="role" defaultValue={sp.role ?? ""} className="field">
              <option value="">Everyone</option>
              {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Location</span>
            <select name="location" defaultValue={sp.location ?? ""} className="field">
              <option value="">All locations</option>
              {(locations ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm">Show</button>
          <p className="basis-full text-sm text-muted">
            {badges.length} {badges.length === 1 ? "badge" : "badges"}. Prints 8 to a page. Cut along the lines, or slip into badge holders.
            A badge signs its owner straight in, so treat it like a key. Lost one? Open the person and tap New QR badge.
          </p>
        </form>
      </div>

      <FillPins />
      <div className="badge-sheet grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {badges.map((b) => (
          <article key={b.id} className="badge-card flex items-center gap-5 rounded-[16px] border border-line bg-white p-5" data-id={b.id}>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <img src="/brand/logo.png" alt="STRATLEARN" width={720} height={119} className="h-auto w-[120px]" />
              <p className="truncate font-serif text-[1.9rem] leading-tight text-plum">{b.display_name}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                <dt className="label text-muted">Team</dt>
                <dd className="font-medium">{s.org.join_code}</dd>
                <dt className="label text-muted">Name</dt>
                <dd className="font-medium">{b.username}</dd>
                <dt className="label text-muted">PIN</dt>
                <dd className="pin-slot font-mono tracking-[0.25em]">____</dd>
              </dl>
              <p className="text-xs text-muted">Scan with your phone camera to start. Or go to {origin.replace(/^https?:\/\//, "")}</p>
            </div>
            <div className="w-[132px] shrink-0" aria-label={`QR sign-in code for ${b.display_name}`} dangerouslySetInnerHTML={{ __html: b.svg }} />
          </article>
        ))}
      </div>
    </>
  );
}
