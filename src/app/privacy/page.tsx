import Link from "next/link";
import { DocPage, LEGAL } from "@/components/doc-page";
import { SUBPROCESSORS } from "../client-agreement/subprocessors";

export const metadata = { title: "STRATLEARN · Privacy Policy", robots: { index: false } };

export default function Privacy() {
  return (
    <DocPage eyebrow="✦ Legal" title={<>Privacy <em>Policy</em></>} updated={LEGAL.updated} draft>
      <p>
        This policy explains what information the STRATLEARN learning platform at {LEGAL.site} collects, why, and who
        can see it. It is run by {LEGAL.company}.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Your employer adds you so you can take training. Your employer controls your training information; we look after it for them.</li>
        <li>We collect only what training needs. We don&apos;t sell your information and we don&apos;t show ads.</li>
        <li>Your managers can see your training progress, scores and certificates. Other workers can&apos;t.</li>
      </ul>

      <h2>What we collect</h2>
      <table>
        <thead>
          <tr><th>Information</th><th>Why</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Name, sign-in name, job role, location, start date, language</td>
            <td>To sign you in, show the right courses, and keep your training record. Your employer enters these.</td>
          </tr>
          <tr>
            <td>PIN, password, QR badge, passkey</td>
            <td>To sign you in. PINs and passwords are stored scrambled (hashed), so nobody can read them, including us.</td>
          </tr>
          <tr>
            <td>Email or mobile number (only if you or your employer add one)</td>
            <td>For sign-in links, reminders and answers from a trainer.</td>
          </tr>
          <tr>
            <td>Course progress, final check scores, time spent, tries, completions, certificates, badges</td>
            <td>To save your place, give you a certificate, and show your employer who is trained.</td>
          </tr>
          <tr>
            <td>Questions you send to a trainer and messages you send through Contact us</td>
            <td>To answer them and improve the courses.</td>
          </tr>
          <tr>
            <td>Basic technical data: sign-in times, device and browser type, error logs</td>
            <td>To keep the Service secure and fix problems.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We don&apos;t collect your location, contacts, photos, or anything from your camera or microphone. Courses may
        read text aloud using your device&apos;s own voice feature; nothing you say is recorded.
      </p>

      <h2>Cookies and saved progress</h2>
      <p>
        We use one sign-in cookie to keep you signed in, and your browser saves your place in a course so you can pick up
        where you left off. We don&apos;t use advertising or tracking cookies.
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li><strong>Your employer&apos;s managers</strong> see your training status, scores, tries, time spent and certificates, and any questions you send a trainer.</li>
        <li><strong>The trainer your employer chose</strong> sees questions you send them.</li>
        <li><strong>Anyone with your certificate code</strong> can check the certificate: your name, the course, your employer&apos;s name and the dates.</li>
        <li><strong>Anyone with a badge link you share</strong> sees your first name, the course and the date. No scores.</li>
        <li><strong>STRATLEARN staff</strong> see information only when needed to support your employer or run the Service.</li>
        <li><strong>Service providers</strong> that host the platform and send email for us (listed below). They may use the information only to provide their service to us.</li>
        <li><strong>Authorities</strong>, if the law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Training records are kept while your employer uses the Service, because many safety and harassment laws require
        employers to keep proof of training for years. Your employer chooses how long. When an employer leaves
        STRATLEARN, we delete their records after giving them 30 days to download a copy.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask to see, correct or delete your information. Because your employer controls your training record,
        we&apos;ll usually pass your request to them. Depending on where you live (for example California), you may have
        more rights, and we won&apos;t treat you differently for using them. To make a request, use{" "}
        <Link href="/contact">Contact us</Link> or ask your manager.
      </p>

      <h2>Security</h2>
      <p>
        Information is sent over encrypted connections and stored with access controls that keep each employer&apos;s
        data separate. Sign-ins lock after repeated wrong PINs. No system is perfect; if something goes wrong that
        affects your information, we will tell your employer quickly so you can be told as the law requires.
      </p>

      <h2>Children</h2>
      <p>The Service is not meant for children under 13, and we don&apos;t knowingly collect their information.</p>

      <h2>Service providers we use</h2>
      <ul>
        {SUBPROCESSORS.map((s) => (
          <li key={s.name}><strong>{s.name}</strong>: {s.purpose}</li>
        ))}
      </ul>

      <h2>Changes and contact</h2>
      <p>
        If we make an important change, we&apos;ll update the date above and tell employers. Questions? Use{" "}
        <Link href="/contact">Contact us</Link> or write to {LEGAL.company}, {LEGAL.address}.
      </p>
    </DocPage>
  );
}
