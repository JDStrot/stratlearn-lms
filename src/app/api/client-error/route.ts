import { NextResponse, type NextRequest } from "next/server";
import { reportError } from "@/lib/alerts";

/**
 * Browser-side errors: a screen that crashed (error pages) or a course file with
 * a script error (course hook). Only accepted from this site's own pages.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { source?: string; message?: string; path?: string; digest?: string; slug?: string; line?: number }
    | null;
  if (!body?.message) return new NextResponse(null, { status: 204 });
  const source = body.source === "course" ? "course" : "browser";
  await reportError({
    source,
    message: String(body.message).slice(0, 1000),
    path: body.path ? String(body.path).slice(0, 300) : null,
    details: {
      digest: body.digest ? String(body.digest).slice(0, 100) : undefined,
      course: body.slug ? String(body.slug).slice(0, 100) : undefined,
      line: typeof body.line === "number" ? body.line : undefined,
      browser: req.headers.get("user-agent")?.slice(0, 200),
    },
  });
  return new NextResponse(null, { status: 204 });
}
