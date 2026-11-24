import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
    <>
    <SiteHeader />
    <main id="main" className="flex flex-1 items-center bg-mist py-16">
      <section className="card mx-auto w-[calc(100%-32px)] max-w-md p-8 text-center shadow-soft">
        {data ? (
          <>
            <p aria-hidden className="text-4xl text-lilac">✦</p>
            <p className="eyebrow mt-2">Certificate check</p>
            <h1 className="mt-2 text-4xl">
              Certificate <em>verified</em>
            </h1>
            <p className="mt-5 text-lg font-medium">{one(data.learners)?.display_name}</p>
            <p className="text-muted">completed</p>
            <p className="text-lg font-medium">{one(data.courses)?.title}</p>
            <p className="mt-4 text-sm text-muted">
              {one(data.organizations)?.name} · {new Date(data.issued_at).toLocaleDateString("en-US")}
              {data.expires_at ? ` · valid until ${new Date(data.expires_at).toLocaleDateString("en-US")}` : ""}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl">Certificate not found</h1>
            <p className="mt-2 text-muted">Check the code and try again.</p>
          </>
        )}
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
