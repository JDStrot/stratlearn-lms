import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Learner sessions. Learners are not Supabase Auth users (they have no email),
 * so after a PIN or QR login the app sets its own signed, httpOnly cookie.
 */

export const SESSION_COOKIE = "sl_learner";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days: "Keep me signed in" on your own phone
const SHARED_DEVICE_SECONDS = 60 * 60 * 12; // shared tablets: ends when the browser closes, or after 12 hours

/** kiosk = signed in on a shared tablet: short session, auto sign-out, back to the name list. */
export type LearnerSession = { lid: string; oid: string; exp: number; kiosk?: boolean };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(lid: string, oid: string, remember = true, kiosk = false): string {
  const body: LearnerSession = {
    lid,
    oid,
    exp: Math.floor(Date.now() / 1000) + (remember ? MAX_AGE_SECONDS : SHARED_DEVICE_SECONDS),
    ...(kiosk ? { kiosk: true } : {}),
  };
  return signValue(body);
}

/** Signs any small JSON value (sessions, passkey challenges, tablet setup). */
export function signValue(value: object): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Checks a signed value; returns null if it was changed or has expired (exp in seconds). */
export function verifyValue<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
    return data.exp && data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

export function decodeSession(token: string | undefined): LearnerSession | null {
  const data = verifyValue<LearnerSession>(token);
  return data && data.lid && data.oid ? data : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export async function startSession(lid: string, oid: string, remember = true, kiosk = false) {
  const store = await cookies();
  if (remember && !kiosk) {
    store.set(SESSION_COOKIE, encodeSession(lid, oid), sessionCookieOptions);
  } else {
    // No maxAge: the browser drops the cookie when it closes (shared devices).
    const { maxAge: _drop, ...sessionOnly } = sessionCookieOptions;
    void _drop;
    store.set(SESSION_COOKIE, encodeSession(lid, oid, false, kiosk), sessionOnly);
  }
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<LearnerSession | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
