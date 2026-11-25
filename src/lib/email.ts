import "server-only";

/**
 * Sends email through Resend (https://resend.com) when RESEND_API_KEY and
 * EMAIL_FROM are set in Vercel. Until then nothing is sent and callers record
 * "not set up", so reminders can be switched on later without code changes.
 */
export function emailReady() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string }[];
}): Promise<"sent" | "not_set_up" | "failed"> {
  if (!emailReady()) return "not_set_up";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, "utf8").toString("base64") })),
      }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
    return res.ok ? "sent" : "failed";
  } catch (e) {
    console.error("email failed", e);
    return "failed";
  }
}
