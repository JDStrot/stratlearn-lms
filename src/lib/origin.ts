import "server-only";
import { headers } from "next/headers";

/** This site's address as the visitor sees it (for QR codes and email links). */
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "learn.stratlearn.co";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
