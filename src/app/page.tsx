import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "./login-form";

export default async function Home() {
  if (await readSession()) redirect("/learn");
  return (
    <>
      <SiteHeader />
      <main id="main" className="on-dark">
        <div className="wrap grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">✦ Team training</p>
            <h1 className="text-[2.6rem] sm:text-6xl">
              Learning with a <em>strategy</em> behind it.
            </h1>
            <p className="max-w-md text-lg">Short, friendly courses you can finish on a break. Pick the easiest way in.</p>
            <ul className="sparkle-list hidden flex-col gap-2 text-[1.05rem] lg:flex">
              <li>Most courses take 5 to 8 minutes</li>
              <li>English or Spanish, any time</li>
              <li>Earn badges and a real certificate</li>
            </ul>
          </div>
          <section aria-labelledby="signin-title" className="card p-6 text-ink shadow-soft sm:p-9">
            <h2 id="signin-title" className="mb-1 text-[2.1rem] text-plum">
              Sign in <em className="text-violet">your</em> way
            </h2>
            <p className="mb-6 text-muted">Choose what works for you.</p>
            <LoginForm />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
