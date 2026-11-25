import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * A client's own document (policy or plan). Workers of that team can open the
 * ones marked visible; the team's managers can open all of them.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: doc } = await db
    .from("org_documents")
    .select("org_id, storage_path, file_name, content_type, visible_to_learners")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  let allowed = false;
  const session = await readSession();
  if (session && doc.visible_to_learners) {
    const { data: l } = await db.from("learners").select("org_id").eq("id", session.lid).eq("is_active", true).maybeSingle();
    allowed = l?.org_id === doc.org_id;
  }
  if (!allowed) {
    const { data: { user } } = await (await supabaseServer()).auth.getUser();
    if (user) {
      const [{ data: staff }, { data: admin }] = await Promise.all([
        db.from("staff_members").select("org_id").eq("user_id", user.id).eq("org_id", doc.org_id).maybeSingle(),
        db.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);
      allowed = !!staff || !!admin;
    }
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await db.storage.from("org-files").download(doc.storage_path);
  if (error || !data) return new NextResponse("File missing", { status: 404 });
  const name = (doc.file_name ?? "document").replace(/[^\w.\- ]/g, "_");
  return new NextResponse(data, {
    headers: {
      "content-type": doc.content_type ?? "application/octet-stream",
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
