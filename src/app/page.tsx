import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function Home() {
  if (await readSession()) redirect("/learn");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <div aria-hidden className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-pink-100 text-4xl">
          🫧
        </div>
        <h1 className="text-3xl font-extrabold">Welcome to StratLearn</h1>
        <p className="mt-2 text-muted">Scan your QR badge, or sign in with your PIN.</p>
      </header>
      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <LoginForm />
      </section>
    </main>
  );
}
