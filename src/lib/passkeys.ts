import "server-only";
import { cookies } from "next/headers";
import { signValue, verifyValue } from "./session";
import { siteOrigin } from "./origin";

/** Face ID / fingerprint sign-in (WebAuthn passkeys). */

const CHALLENGE_COOKIE = "sl_pk";

export async function relyingParty() {
  const origin = await siteOrigin();
  return { origin, rpID: new URL(origin).hostname, rpName: "STRATLEARN" };
}

/** Keeps the one-time challenge in a short-lived signed cookie (5 minutes). */
export async function saveChallenge(challenge: string, lid?: string) {
  (await cookies()).set(CHALLENGE_COOKIE, signValue({ c: challenge, lid, exp: Math.floor(Date.now() / 1000) + 300 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/passkey",
    maxAge: 300,
  });
}

export async function takeChallenge(): Promise<{ c: string; lid?: string } | null> {
  const store = await cookies();
  const data = verifyValue<{ c: string; lid?: string; exp: number }>(store.get(CHALLENGE_COOKIE)?.value);
  store.delete({ name: CHALLENGE_COOKIE, path: "/api/passkey" });
  return data;
}

export const toB64 = (u: Uint8Array) => Buffer.from(u).toString("base64url");
export const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));
