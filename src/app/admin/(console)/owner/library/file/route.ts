import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Owner-only: opens any archived version of a course file, for audits. */
export async function GET(req: NextRequest) {
  const s = await requireStaff();
  if (!s.isPlatformAdmin) return new NextResponse("Not allowed", { status: 403 });
  const course = req.nextUrl.searchParams.get("course") ?? "";
  const version = Number(req.nextUrl.searchParams.get("v"));
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("course_versions")
    .select("storage_path")
    .eq("course_id", course)
    .eq("version", version)
    .maybeSingle();
  if (!row?.storage_path) return new NextResponse("Version not found", { status: 404 });
  const { data, error } = await db.storage.from("courses").download(row.storage_path);
  if (error || !data) return new NextResponse("File missing", { status: 404 });
  return new NextResponse(await data.text(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}
