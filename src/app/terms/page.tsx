import Link from "next/link";
import { DocPage, LEGAL } from "@/components/doc-page";

export const metadata = { title: "STRATLEARN · Terms of Service", robots: { index: false } };

export default function Terms() {
  return (
    <DocPage eyebrow="✦ Legal" title={<>Terms of <em>Service</em></>} updated={LEGAL.updated} draft>
      <p>
        These terms cover your use of the STRATLEARN learning platform at {LEGAL.site} (the &quot;Service&quot;), run by{" "}
        {LEGAL.company} (&quot;STRATLEARN&quot;, &quot;we&quot;, &quot;us&quot;). By signing in or using the Service you
        agree to them. If your employer signed a separate agreement with us, that agreement wins where the two differ.
      </p>

      <h2>Who uses the Service</h2>
      <ul>
        <li>
          <strong>Clients</strong> are the businesses that buy the Service for their teams. Their{" "}
          <strong>managers</strong> use the manager console.
        </li>
        <li>
          <strong>Learners</strong> are the workers a client adds so they can take training.
        </li>
      </ul>
      <p>
        Learners must be at least 13 years old. Learners under 18 use the Service only because their employer added them,
        and the employer is responsible for any consent their state requires.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your PIN, password, QR badge and sign-in links to yourself. Tell your manager right away if someone else may have them.</li>
        <li>Take your own training. Letting someone else finish a course for you can make your training record invalid.</li>
        <li>Managers are responsible for the people they add, the information they enter, and turning off people who leave.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>try to get into accounts, teams or data that aren&apos;t yours;</li>
        <li>copy, resell, share outside your team, or upload courses to another system without our written OK;</li>
        <li>send spam, harassment, or unlawful content through Contact Us, Ask a trainer, or any other form;</li>
        <li>overload, scan, or interfere with the Service.</li>
      </ul>
      <p>We may pause or close access that breaks these rules.</p>

      <h2>Courses and certificates</h2>
      <ul>
        <li>
          Courses, characters (including Lottie and friends), artwork and the platform belong to STRATLEARN or our
          licensors. Clients get a license to use them with their own team for as long as their plan is active.
        </li>
        <li>
          Courses are training, not legal, medical or professional advice. Each client is responsible for its own
          workplace safety and legal compliance, including choosing the right courses for its locations and roles, and
          for any site-specific training a regulator requires.
        </li>
        <li>
          Certificates show that a learner finished a course and passed its final check on the date shown. Anyone with a
          certificate code can check it on our verify page.
        </li>
        <li>
          Badges you share to social media are public pages that show your first name, the course and the date. You
          choose whether to share them.
        </li>
      </ul>

      <h2>Client content</h2>
      <p>
        Clients own the policies, documents, logos and learner information they add. They give us permission to store and
        show that content only to run the Service for them. Our{" "}
        <Link href="/client-agreement">client data agreement</Link> explains how we handle it.
      </p>

      <h2>Fees</h2>
      <p>
        Clients pay the fees in their order form or plan. Unless the order form says otherwise, fees are billed ahead of
        time, are not refundable for a term already started, and may change at renewal with 30 days&apos; notice. Seats
        can be moved from someone who left to someone new.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep the Service running and secure, but it may sometimes be unavailable for maintenance or reasons
        outside our control. We may improve or change features and courses. We won&apos;t remove a course a client is
        using in the middle of a paid term without offering a replacement, and course updates never erase past
        completions or certificates.
      </p>

      <h2>Ending the Service</h2>
      <p>
        A client may stop at the end of its term. We may suspend access for unpaid fees or serious misuse after notice.
        When a client leaves, it can download its training records for 30 days, after which we delete them as described
        in the <Link href="/client-agreement">client data agreement</Link>.
      </p>

      <h2>Warranties and liability</h2>
      <p>
        Apart from what a signed client agreement promises, the Service is provided &quot;as is&quot;. To the extent the
        law allows, STRATLEARN is not liable for indirect or consequential losses, and our total liability for any claim
        is limited to the fees the client paid us in the 12 months before the claim.
      </p>

      <h2>General</h2>
      <ul>
        <li>These terms are governed by the laws of {LEGAL.state}, USA.</li>
        <li>We may update these terms. If a change is important we&apos;ll tell clients at least 30 days ahead.</li>
        <li>
          Questions? Use <Link href="/contact">Contact us</Link> or write to {LEGAL.company}, {LEGAL.address}.
        </li>
      </ul>
      <p>
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </DocPage>
  );
}
