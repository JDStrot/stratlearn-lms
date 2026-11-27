import "server-only";
import { signValue, verifyValue } from "./session";

/**
 * Light spam guards for public forms (no puzzles for real people):
 *  - a hidden "website" field that only bots fill in (in the form itself),
 *  - a signed time stamp: forms sent within a few seconds of loading are bots,
 *  - a cap on links, since spam is almost always links.
 * Rate limits live next to each form, because they count that form's own table.
 */

const MIN_SECONDS = 3;
const MAX_AGE_SECONDS = 60 * 60 * 24; // a form left open for a day needs a reload

/** A signed "form shown at" stamp to put in a hidden field. */
export function formStamp(): string {
  const now = Math.floor(Date.now() / 1000);
  return signValue({ t: now, exp: now + MAX_AGE_SECONDS });
}

/** "ok", "bot" (pretend it worked, save nothing) or "stale" (ask them to reload). */
export function checkStamp(stamp: FormDataEntryValue | null | undefined): "ok" | "bot" | "stale" {
  const data = verifyValue<{ t: number; exp: number }>(typeof stamp === "string" ? stamp : undefined);
  if (!data) return "stale";
  return Date.now() / 1000 - data.t < MIN_SECONDS ? "bot" : "ok";
}

export function countLinks(text: string): number {
  return (text.match(/https?:\/\/|www\.|\[url=|<a\s/gi) ?? []).length;
}

export const MAX_LINKS = 3;
