import { NextResponse, type NextRequest } from "next/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture, RegistrationResponseJSON } from "@simplewebauthn/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { relyingParty, saveChallenge, takeChallenge, toB64 } from "@/lib/passkeys";

/** GET: options to add Face ID / fingerprint for the signed-in learner. POST: save it. */
export async function GET() {
  const session = await readSession();
  if (!session || session.kiosk) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const db = supabaseAdmin();
  const [{ data: learner }, { data: existing }] = await Promise.all([
    db.from("learners").select("id, display_name, username").eq("id", session.lid).maybeSingle(),
    db.from("learner_passkeys").select("id, transports").eq("learner_id", session.lid),
  ]);
  if (!learner) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { rpID, rpName } = await relyingParty();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: learner.username,
    userDisplayName: learner.display_name,
    userID: new TextEncoder().encode(learner.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p) => ({ id: p.id, transports: p.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await saveChallenge(options.challenge, learner.id);
  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  const saved = await takeChallenge();
  if (!session || !saved || saved.lid !== session.lid) {
    return NextResponse.json({ error: "Please try again." }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { response?: RegistrationResponseJSON; device?: string } | null;
  if (!body?.response) return NextResponse.json({ error: "Please try again." }, { status: 400 });
  const { origin, rpID } = await relyingParty();
  try {
    const result = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: saved.c,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!result.verified) throw new Error("not verified");
    const cred = result.registrationInfo.credential;
    await supabaseAdmin()
      .from("learner_passkeys")
      .upsert({
        id: cred.id,
        learner_id: session.lid,
        public_key: toB64(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports ?? [],
        device_name: (body.device ?? "").slice(0, 60) || null,
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("passkey register", (e as Error).message);
    return NextResponse.json({ error: "That didn't work. Please try again." }, { status: 400 });
  }
}
