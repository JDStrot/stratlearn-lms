import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StaffLoginForm } from "./form";

export const metadata = { title: "STRATLEARN · Manager sign-in" };

export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main id="main" className="on-dark flex-1">
        <div className="wrap grid items-center gap-10 py-12 lg:grid-cols-[1fr_1fr] lg:py-24">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">✦ For managers</p>
            <h1 className="text-[2.6rem] sm:text-6xl">
              Your team&apos;s training, <em>handled</em>.
            </h1>
            <ul className="sparkle-list flex flex-col gap-2 text-[1.05rem]">
              <li>Add people and print sign-in badges</li>
              <li>Assign training by role or location</li>
              <li>See who&apos;s done and who&apos;s overdue</li>
              <li>Download audit-ready records</li>
            </ul>
          </div>
          <section aria-labelledby="mgr-title" className="card p-6 text-ink shadow-soft sm:p-9">
            <h2 id="mgr-title" className="mb-1 text-[2.1rem] text-plum">Manager <em className="text-violet">sign-in</em></h2>
            <p className="mb-6 text-muted">Learners sign in on the main page.</p>
            {e === "noaccess" && (
              <p role="alert" className="mb-4 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                That account isn&apos;t a manager on any team yet. Ask your team owner to add you.
              </p>
            )}
            {e === "link" && (
              <p role="alert" className="mb-4 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                That sign-in link expired or was already used. Send a new one.
              </p>
            )}
            <StaffLoginForm />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
