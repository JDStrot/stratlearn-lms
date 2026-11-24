import { NextResponse, type NextRequest } from "next/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { startSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fromB64, relyingParty, saveChallenge, takeChallenge } from "@/lib/passkeys";
import { DEFAULT_LOGIN_SETTINGS, type LoginSettings } from "@/lib/staff";

/** GET: a Face ID / fingerprint challenge. POST: check it and sign the learner in. */
export async function GET() {
  const { rpID } = await relyingParty();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  await saveChallenge(options.challenge);
  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const saved = await takeChallenge();
  const body = (await req.json().catch(() => null)) as { response?: AuthenticationResponseJSON } | null;
  const fail = (error = "We didn't recognize that. Use your PIN this time.") =>
    NextResponse.json({ error }, { status: 400 });
  if (!saved || !body?.response?.id) return fail();

  const db = supabaseAdmin();
  const { data: pk } = await db
    .from("learner_passkeys")
    .select("id, learner_id, public_key, counter, transports, learners!inner(id, org_id, is_active, organizations(login_settings))")
    .eq("id", body.response.id)
    .maybeSingle();
  if (!pk) return fail();
  const learner = pk.learners as unknown as { id: string; org_id: string; is_active: boolean; organizations: { login_settings: Partial<LoginSettings> } | null };
  if (!learner.is_active) return fail();
  const settings = { ...DEFAULT_LOGIN_SETTINGS, ...(learner.organizations?.login_settings ?? {}) };
  if (!settings.passkey) return fail("Your team doesn't use Face ID sign-in. Use your PIN or QR badge.");

  const { origin, rpID } = await relyingParty();
  try {
    const result = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: saved.c,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: pk.id,
        publicKey: fromB64(pk.public_key),
        counter: Number(pk.counter),
        transports: pk.transports as AuthenticatorTransportFuture[],
      },
    });
    if (!result.verified) return fail();
    const now = new Date().toISOString();
    await Promise.all([
      db.from("learner_passkeys").update({ counter: result.authenticationInfo.newCounter, last_used_at: now }).eq("id", pk.id),
      db.from("learners").update({ last_login_at: now }).eq("id", learner.id),
    ]);
    await startSession(learner.id, learner.org_id, true);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("passkey login", (e as Error).message);
    return fail();
  }
}
