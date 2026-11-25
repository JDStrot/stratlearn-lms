import { NextResponse, type NextRequest } from "next/server";
import { readCertificate } from "@/lib/org-settings";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** A team's certificate logo (public: it's printed on public certificate pages). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const db = supabaseAdmin();
  const { data: org } = await db.from("organizations").select("certificate_settings").eq("id", orgId).maybeSingle();
  const path = readCertificate(org?.certificate_settings).logo_path;
  if (!path || !path.startsWith(`${orgId}/branding/`)) return new NextResponse("No logo", { status: 404 });
  const { data, error } = await db.storage.from("org-files").download(path);
  if (error || !data) return new NextResponse("No logo", { status: 404 });
  return new NextResponse(data, {
    headers: { "content-type": data.type || "image/png", "cache-control": "public, max-age=300" },
  });
}
