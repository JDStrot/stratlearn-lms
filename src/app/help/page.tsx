import Link from "next/link";
import { DocPage } from "@/components/doc-page";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "STRATLEARN · Help" };

type QA = { q: string; a: React.ReactNode };

const EN: { title: string; items: QA[] }[] = [
  {
    title: "Signing in",
    items: [
      {
        q: "How do I sign in?",
        a: (
          <>
            Go to <strong>learn.stratlearn.co</strong>. Type your <strong>team code</strong>, your <strong>name</strong>{" "}
            (usually first.last, like maria.lopez) and your <strong>PIN</strong>. All three are on the welcome slip from
            your manager.
          </>
        ),
      },
      { q: "Can I use my badge instead?", a: "Yes. Open your phone's camera, point it at the QR code on your badge, and tap the link that pops up. No typing." },
      { q: "I forgot my PIN.", a: "Ask your manager. They can give you a new PIN in a few seconds. For safety, we can't show or send your old PIN." },
      {
        q: "It says I'm locked out.",
        a: "After 5 wrong PINs, sign-in locks for 15 minutes to keep your account safe. Wait 15 minutes and try again, or ask your manager to unlock you right away.",
      },
      { q: "My QR badge doesn't work.", a: "Make sure the code is flat, clean and well lit. If it still doesn't work, your manager can print you a new badge. The old one stops working." },
      { q: "We share a tablet at work.", a: "Tap your name on the tablet, type your PIN, and tap \"I'm done\" when you finish so the next person can sign in." },
      { q: "Can I sign in with email?", a: "If your manager added your email, you can get a sign-in link by email or set a password. Email is never required." },
    ],
  },
  {
    title: "Taking courses",
    items: [
      { q: "How long are courses?", a: "Most take 5 to 8 minutes. You can stop any time and pick up where you left off on the same phone or tablet." },
      { q: "Can I take courses in Spanish?", a: "Yes. Every course has an EN | ES switch at the top. You can also pick your language on your account page." },
      { q: "A course won't load or gets stuck.", a: "Check your internet, then close the course and open it again. If it still won't work, tell us with the form below and say which course." },
      { q: "I didn't pass the final check.", a: "You can try again. If you run out of tries, your manager can give you more." },
      { q: "I have a question about what the course says.", a: "Inside many courses there's an \"Ask a trainer\" button. Your question goes to your team's trainer, and the answer shows up right in the course." },
    ],
  },
  {
    title: "Certificates, badges and privacy",
    items: [
      { q: "Where is my certificate?", a: "On your home page, under Finished. Tap Certificate to see, print or save it. Your manager can see it too." },
      { q: "Can I share my badge?", a: "Yes. Sharing shows only your first name, the course and the date. No scores." },
      {
        q: "Who can see my results?",
        a: (
          <>
            Your managers can see your progress, scores and certificates. Other workers can&apos;t. Read more in our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </>
        ),
      },
    ],
  },
];

const ES: { title: string; items: QA[] }[] = [
  {
    title: "Entrar",
    items: [
      {
        q: "¿Cómo entro?",
        a: (
          <>
            Ve a <strong>learn.stratlearn.co</strong>. Escribe el <strong>código de tu equipo</strong>, tu{" "}
            <strong>nombre</strong> (casi siempre nombre.apellido, como maria.lopez) y tu <strong>PIN</strong>. Los tres
            están en la hoja de bienvenida que te dio tu gerente.
          </>
        ),
      },
      { q: "¿Puedo usar mi gafete?", a: "Sí. Abre la cámara de tu teléfono, apunta al código QR de tu gafete y toca el enlace que aparece. Sin escribir nada." },
      { q: "Olvidé mi PIN.", a: "Pídele a tu gerente un PIN nuevo. Toma unos segundos. Por seguridad, no podemos mostrar ni enviar tu PIN anterior." },
      {
        q: "Dice que estoy bloqueado.",
        a: "Después de 5 PIN equivocados, la entrada se bloquea 15 minutos para proteger tu cuenta. Espera 15 minutos e inténtalo otra vez, o pide a tu gerente que te desbloquee.",
      },
      { q: "Mi gafete QR no funciona.", a: "Revisa que el código esté plano, limpio y con buena luz. Si sigue sin funcionar, tu gerente puede imprimirte uno nuevo. El anterior deja de funcionar." },
      { q: "Compartimos una tableta en el trabajo.", a: "Toca tu nombre en la tableta, escribe tu PIN y toca \"Terminé\" al acabar para que entre la siguiente persona." },
      { q: "¿Puedo entrar con email?", a: "Si tu gerente agregó tu email, puedes recibir un enlace por email o crear una contraseña. El email nunca es obligatorio." },
    ],
  },
  {
    title: "Tomar cursos",
    items: [
      { q: "¿Cuánto duran los cursos?", a: "La mayoría dura de 5 a 8 minutos. Puedes parar cuando quieras y seguir donde te quedaste en el mismo teléfono o tableta." },
      { q: "¿Puedo tomar los cursos en español?", a: "Sí. Cada curso tiene un botón EN | ES arriba. También puedes elegir tu idioma en tu cuenta." },
      { q: "Un curso no abre o se traba.", a: "Revisa tu internet, cierra el curso y ábrelo otra vez. Si sigue fallando, avísanos con el formulario de abajo y dinos qué curso." },
      { q: "No pasé la prueba final.", a: "Puedes intentarlo otra vez. Si se acaban tus intentos, tu gerente puede darte más." },
      { q: "Tengo una pregunta sobre el curso.", a: "En muchos cursos hay un botón \"Preguntar a un capacitador\". Tu pregunta llega al capacitador de tu equipo y la respuesta aparece en el curso." },
    ],
  },
  {
    title: "Certificados, insignias y privacidad",
    items: [
      { q: "¿Dónde está mi certificado?", a: "En tu página principal, en Terminado. Toca Certificado para verlo, imprimirlo o guardarlo. Tu gerente también lo puede ver." },
      { q: "¿Puedo compartir mi insignia?", a: "Sí. Solo se ve tu primer nombre, el curso y la fecha. Sin calificaciones." },
      {
        q: "¿Quién ve mis resultados?",
        a: (
          <>
            Tus gerentes ven tu avance, calificaciones y certificados. Otros trabajadores no. Lee más en nuestra{" "}
            <Link href="/privacy">Política de privacidad</Link>.
          </>
        ),
      },
    ],
  },
];

export default async function Help({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  let es = lang === "es";
  if (!lang) {
    const session = await readSession();
    if (session) {
      const { data } = await supabaseAdmin().from("learners").select("preferred_language").eq("id", session.lid).maybeSingle();
      es = data?.preferred_language === "es";
    }
  }
  const groups = es ? ES : EN;
  return (
    <DocPage es={es} eyebrow={es ? "✦ Ayuda" : "✦ Help"} title={es ? <>¿Cómo te <em>ayudamos</em>?</> : <>How can we <em>help</em>?</>}>
      <p>
        <Link href={es ? "/help?lang=en" : "/help?lang=es"}>{es ? "Read in English" : "Leer en español"}</Link>
      </p>
      {groups.map((g) => (
        <section key={g.title}>
          <h2>{g.title}</h2>
          {g.items.map((it) => (
            <details key={it.q} className="card mb-3 p-4">
              <summary className="cursor-pointer font-medium text-ink">{it.q}</summary>
              <p className="mt-2 mb-0">{it.a}</p>
            </details>
          ))}
        </section>
      ))}
      <h2>{es ? "¿Todavía necesitas ayuda?" : "Still stuck?"}</h2>
      <p>
        {es
          ? "Para tu PIN, gafete o cursos asignados, habla primero con tu gerente. Para cualquier otra cosa, "
          : "For your PIN, badge or assigned courses, your manager can help fastest. For anything else, "}
        <Link href="/contact">{es ? "envíanos un mensaje" : "send us a message"}</Link>
        {es ? ". Respondemos en un día hábil." : ". We answer within one business day."}
      </p>
      <p className="text-sm text-muted">
        {es ? "¿Eres gerente? " : "Are you a manager? "}
        <Link href="/admin/help">{es ? "Guía rápida para gerentes" : "Manager quick-start guide"}</Link>
      </p>
    </DocPage>
  );
}
