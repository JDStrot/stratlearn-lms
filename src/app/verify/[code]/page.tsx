import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { readCertificate } from "@/lib/org-settings";
import { LocalDate } from "@/components/local-date";
import { PrintButton } from "@/app/admin/(console)/badges/print-tools";

/** Public page that confirms a certificate is real: /verify/<code>. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-F0-9]/g, "");
  const { data } = await supabaseAdmin()
    .from("certificates")
    .select("issued_at, expires_at, learners(display_name), courses(title), org_id, organizations(name, certificate_settings), completions(course_version)")
    .eq("verify_code", clean)
    .maybeSingle();

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const brand = readCertificate(one(data?.organizations as { certificate_settings?: unknown } | undefined)?.certificate_settings);

  return (
    <>
    <SiteHeader />
    <main id="main" className="flex flex-1 items-center bg-mist py-16">
      <section className="card mx-auto w-[calc(100%-32px)] max-w-md p-8 text-center shadow-soft">
        {data ? (
          <>
            {brand.logo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/org-logo/${data.org_id}`} alt={one(data.organizations)?.name ?? "Company logo"} className="mx-auto mb-2 h-16 max-w-[220px] object-contain" />
            ) : (
              <p aria-hidden className="text-4xl text-lilac">✦</p>
            )}
            <p className="eyebrow mt-2">Certificate check</p>
            <h1 className="mt-2 text-4xl">
              Certificate <em>verified</em>
            </h1>
            <p className="mt-5 text-lg font-medium">{one(data.learners)?.display_name}</p>
            <p className="text-muted">completed</p>
            <p className="text-lg font-medium">{one(data.courses)?.title}</p>
            {one(data.completions)?.course_version ? (
              <p className="text-sm text-muted">Version {one(data.completions)?.course_version}</p>
            ) : null}
            <p className="mt-4 text-sm text-muted">
              {one(data.organizations)?.name}
              <br />
              Completed <LocalDate iso={data.issued_at} time />
              {data.expires_at ? (
                <>
                  <br />
                  Valid until <LocalDate iso={data.expires_at} />
                </>
              ) : null}
            </p>
            {brand.signer_name && (
              <p className="mt-6 border-t border-line pt-3 text-sm">
                <span className="block font-serif text-xl text-plum">{brand.signer_name}</span>
                {brand.signer_title && <span className="text-muted">{brand.signer_title}</span>}
              </p>
            )}
            <div className="mt-6 print:hidden">
              <PrintButton />
            </div>
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
