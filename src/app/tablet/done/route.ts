import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** "I'm done" on a shared tablet (or the idle timer): sign out, back to the name list. */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/tablet", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
