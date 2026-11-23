import { supabaseAdmin } from "@/lib/supabase/admin";

/** Public page that confirms a certificate is real: /verify/<code>. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-F0-9]/g, "");
  const { data } = await supabaseAdmin()
    .from("certificates")
    .select("issued_at, expires_at, learners(display_name), courses(title), organizations(name)")
    .eq("verify_code", clean)
    .maybeSingle();

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <section className="rounded-3xl bg-card p-6 text-center shadow-sm">
        {data ? (
          <>
            <p className="text-4xl">🏅</p>
            <h1 className="mt-2 text-2xl font-extrabold">Certificate verified</h1>
            <p className="mt-4 text-lg font-semibold">{one(data.learners)?.display_name}</p>
            <p className="text-muted">completed</p>
            <p className="text-lg font-semibold">{one(data.courses)?.title}</p>
            <p className="mt-4 text-sm text-muted">
              {one(data.organizations)?.name} · {new Date(data.issued_at).toLocaleDateString("en-US")}
              {data.expires_at ? ` · valid until ${new Date(data.expires_at).toLocaleDateString("en-US")}` : ""}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Certificate not found</h1>
            <p className="mt-2 text-muted">Check the code and try again.</p>
          </>
        )}
      </section>
    </main>
  );
}
