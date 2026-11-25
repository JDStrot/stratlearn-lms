import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner } from "../../../owner-actions";
import { loadTeam } from "../../../data";
import { teamInsights, toRange } from "../../../insights";
import { PlatformDashboard, type ClientInsights } from "./platform-dashboard";

export const metadata = { title: "STRATLEARN · Platform dashboards" };

/** Jesse's dashboards across every client team. */
export default async function OwnerDashboards({ searchParams }: { searchParams: Promise<{ range?: string; plan?: string }> }) {
  const f = await searchParams;
  await requireOwner();
  const range = toRange(f.range);
  const { data: orgRows } = await supabaseAdmin()
    .from("organizations")
    .select("id, name, plan, status, seat_limit")
    .order("name");
  const orgs = ((orgRows ?? []) as ClientInsights["org"][]).filter((o) => !f.plan || o.plan === f.plan);
  const plans = [...new Set((orgRows ?? []).map((o) => o.plan as string))].sort();
  const per: ClientInsights[] = await Promise.all(
    orgs.map(async (o) => ({ org: o, d: await teamInsights(await loadTeam(o.id), o.id, { range }) })),
  );
  return <PlatformDashboard per={per} orgs={orgs} plans={plans} range={range} f={f} />;
}
