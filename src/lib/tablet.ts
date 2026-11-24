import "server-only";
import { cookies } from "next/headers";
import { signValue, verifyValue } from "./session";

/** A shared break-room tablet, set up by a manager for one team. */
export const TABLET_COOKIE = "sl_tablet";
const YEAR = 60 * 60 * 24 * 365;

export async function setTablet(orgId: string) {
  (await cookies()).set(TABLET_COOKIE, signValue({ oid: orgId, exp: Math.floor(Date.now() / 1000) + YEAR }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
}

export async function readTablet(): Promise<string | null> {
  return verifyValue<{ oid: string; exp: number }>((await cookies()).get(TABLET_COOKIE)?.value)?.oid ?? null;
}

export async function clearTablet() {
  (await cookies()).delete(TABLET_COOKIE);
}
