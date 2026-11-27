import Link from "next/link";
import { DocPage, LEGAL } from "@/components/doc-page";
import { SUBPROCESSORS } from "./subprocessors";

export const metadata = { title: "STRATLEARN · Client data agreement", robots: { index: false } };

export default function ClientAgreement() {
  return (
    <DocPage eyebrow="✦ Legal · For clients" title={<>Client data <em>agreement</em></>} updated={LEGAL.updated} draft>
      <p>
        This data processing agreement (&quot;DPA&quot;) is part of the agreement between {LEGAL.company}
        (&quot;STRATLEARN&quot;) and each business that uses the STRATLEARN learning platform (the &quot;Client&quot;).
        It explains how STRATLEARN handles personal information about the Client&apos;s workers and managers. It applies
        automatically when the Client uses the Service. A signed copy is available on request.
      </p>

      <h2>1. Roles</h2>
      <p>
        The Client decides what personal information goes into the Service and why (the &quot;controller&quot; or
        &quot;business&quot;). STRATLEARN handles it only on the Client&apos;s behalf (the &quot;processor&quot; or
        &quot;service provider&quot;, including under the California Consumer Privacy Act).
      </p>

      <h2>2. What data and why</h2>
      <ul>
        <li><strong>People:</strong> the Client&apos;s workers, managers and trainers.</li>
        <li><strong>Data:</strong> names, sign-in names, job roles, locations, start dates, language, optional email and phone, sign-in secrets (stored hashed), training progress, scores, completions, certificates, badges, trainer questions and answers, and uploaded policies.</li>
        <li><strong>Purpose:</strong> delivering, tracking and proving training, and supporting the Client.</li>
        <li><strong>Sensitive data:</strong> the Service is not designed for health, financial or government ID data, and the Client agrees not to upload it.</li>
      </ul>

      <h2>3. Our promises</h2>
      <ol>
        <li>We use Client data only to provide the Service and follow the Client&apos;s instructions (including settings chosen in the manager console).</li>
        <li>We never sell or share Client data for advertising, and never combine it with other data except to run the Service.</li>
        <li>Everyone at STRATLEARN who can access Client data is bound to keep it confidential.</li>
        <li>We keep appropriate security in place (section 4) and review it as the Service grows.</li>
        <li>We help the Client answer requests from its workers to see, correct or delete their data.</li>
        <li>We tell the Client without undue delay, and within 72 hours, after we confirm a security incident affecting its data, and help with any notices the law requires.</li>
        <li>We tell the Client if we believe an instruction breaks the law.</li>
      </ol>

      <h2>4. Security measures</h2>
      <ul>
        <li>Encrypted connections (HTTPS) for all traffic; data encrypted at rest by our hosting providers.</li>
        <li>Each client&apos;s data is kept separate by database access rules. Managers see only their own team (and only their own locations if the Client sets that).</li>
        <li>PINs and passwords are hashed. PIN sign-in locks after 5 wrong tries.</li>
        <li>Secret keys are kept on the server only, and access to production systems is limited to named STRATLEARN staff.</li>
        <li>Manager actions are recorded in an activity log the Client can download.</li>
        <li>Daily database backups [requires the paid database plan; confirm before signing].</li>
      </ul>

      <h2>5. Subprocessors</h2>
      <p>The Client agrees we may use these companies to run the Service:</p>
      <table>
        <thead>
          <tr><th>Company</th><th>What they do</th><th>Where</th></tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((s) => (
            <tr key={s.name}><td>{s.name}</td><td>{s.purpose}</td><td>{s.where}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        Each is bound by written data protection terms at least as protective as this DPA. We&apos;ll give 30 days&apos;
        notice before adding a new one; the Client may object for a reasonable data protection reason, and if we
        can&apos;t resolve it, end the affected part of the Service with a pro-rated refund.
      </p>

      <h2>6. Where data is stored</h2>
      <p>Client data is stored and processed in the United States.</p>

      <h2>7. Keeping and deleting data</h2>
      <ul>
        <li>We keep training records while the Client uses the Service, for as long as the Client chooses in its record settings.</li>
        <li>When the Client leaves, it can download its records (status, full training records with certificate codes, and the activity log) for 30 days.</li>
        <li>After that we delete Client data within 30 more days, except backups, which roll off within 35 days, and anything the law requires us to keep.</li>
      </ul>

      <h2>8. Audits</h2>
      <p>
        Once a year, or after a security incident, the Client may ask for a written summary of our security measures and
        answers to a reasonable security questionnaire.
      </p>

      <h2>9. Liability and order</h2>
      <p>
        This DPA sits under the limits of liability in the <Link href="/terms">Terms of Service</Link> or the
        Client&apos;s signed agreement. If this DPA and another document disagree about personal data, this DPA wins.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy and security questions: <Link href="/contact">Contact us</Link>, or {LEGAL.company}, {LEGAL.address}.
        See also the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </DocPage>
  );
}
