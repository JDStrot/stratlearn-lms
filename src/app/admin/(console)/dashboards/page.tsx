import { requireStaff } from "@/lib/staff";
import { loadTeam } from "../../data";
import { teamInsights, type Filter } from "../../insights";
import { TeamDashboard } from "./team-dashboard";

export const metadata = { title: "STRATLEARN · Dashboards" };

export default async function Dashboards({ searchParams }: { searchParams: Promise<Filter> }) {
  const f = await searchParams;
  const s = await requireStaff();
  const team = await loadTeam(s.org.id);
  const d = await teamInsights(team, s.org.id, f);
  return <TeamDashboard orgName={s.org.name} roles={team.roles} locations={team.locations} d={d} f={f} />;
}
