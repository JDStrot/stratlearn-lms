import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireStaff } from "@/lib/staff";
import { staffSignOut, switchTeam } from "../actions";
import { AdminNav } from "./nav";

export const metadata = { title: "STRATLEARN · Manager console" };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur print:hidden">
        <div className="wrap flex min-h-[68px] flex-wrap items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Manager console home" className="no-underline">
              <Logo />
            </Link>
            {s.orgs.length > 1 ? (
              <form action={switchTeam} className="flex items-center gap-2">
                <label className="sr-only" htmlFor="team-pick">Team</label>
                <select id="team-pick" name="orgId" defaultValue={s.org.id} className="field !min-h-[40px] !py-1 !text-sm" >
                  {s.orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm !min-h-[40px]">Open</button>
              </form>
            ) : (
              <span className="chip">{s.org.name}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted md:inline">{s.email}</span>
            <form action={staffSignOut}>
              <button className="btn btn-ghost btn-sm">Sign out</button>
            </form>
          </div>
        </div>
        <AdminNav owner={s.isPlatformAdmin} />
      </header>
      <main id="main" className="wrap flex-1 py-8 lg:py-10">{children}</main>
    </div>
  );
}
