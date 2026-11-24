#!/usr/bin/env node
// Publishes the course catalog in courses/catalog.json to Supabase.
//
// Runs before every production build on Vercel (see "build" in package.json):
//   1. uploads each courses/lottie/<slug>/bilingual.html to the private
//      "courses" storage bucket at lottie/<slug>/v<version>/bilingual.html
//   2. adds or updates the course row (title EN + ES, minutes, published)
//      and its completion badge
//   3. adds or updates the packs and their role-path tabs
//   4. switches the packs on for the demo team and assigns every course to it
//
// It only runs when VERCEL_ENV is "production" or SYNC_COURSES=1, so preview
// builds of a pull request never touch the live catalog. It never fails the
// build: problems are printed and the site deploys as before.
//
// Run it by hand: SYNC_COURSES=1 node --env-file=.env.local scripts/sync-courses.mjs
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = fileURLToPath(new URL("../courses/", import.meta.url));

async function main() {
  if (process.env.VERCEL_ENV !== "production" && process.env.SYNC_COURSES !== "1") {
    console.log("[courses] skip: not a production build");
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[courses] skip: Supabase URL or secret key is not set");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const catalog = JSON.parse(await readFile(join(ROOT, "catalog.json"), "utf8"));

  const { data: existing, error: readErr } = await db.from("courses").select("id, slug, version");
  if (readErr) throw new Error(`read courses: ${readErr.message}`);
  const bySlug = new Map(existing.map((c) => [c.slug, c]));

  // 1 + 2. Course files, rows and badges (a few at a time).
  const failed = [];
  const queue = [...catalog.courses];
  async function worker() {
    for (let slug = queue.shift(); slug; slug = queue.shift()) {
      try {
        await syncCourse(db, slug, bySlug);
      } catch (e) {
        failed.push(slug);
        console.error(`[courses] fail ${slug}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  const { data: rows, error: idErr } = await db.from("courses").select("id, slug");
  if (idErr) throw new Error(`read courses: ${idErr.message}`);
  const ids = new Map(rows.map((c) => [c.slug, c.id]));

  // 3. Packs and their path tabs.
  const packIds = [];
  const { data: knownPacks } = await db.from("packs").select("slug");
  const packExists = new Set((knownPacks ?? []).map((p) => p.slug));
  for (const p of catalog.packs) {
    const { data: pack, error } = await db
      .from("packs")
      .upsert(
        {
          slug: p.slug,
          title: p.title,
          title_es: p.title_es,
          description: p.description,
          industry: p.industry,
          ...(packExists.has(p.slug) ? {} : { is_published: true }),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`pack ${p.slug}: ${error.message}`);
    packIds.push(pack.id);

    const links = [];
    for (const [path, slugs] of Object.entries(p.paths)) {
      slugs.forEach((slug, position) => {
        const course_id = ids.get(slug);
        if (course_id) links.push({ pack_id: pack.id, course_id, path, position, required: path === "core" });
      });
    }
    const del = await db.from("pack_courses").delete().eq("pack_id", pack.id);
    if (del.error) throw new Error(`pack ${p.slug}: ${del.error.message}`);
    const ins = await db.from("pack_courses").insert(links);
    if (ins.error) throw new Error(`pack ${p.slug}: ${ins.error.message}`);
  }

  // 4. Demo team: all packs on, every catalog course assigned to everyone.
  const { data: org } = await db
    .from("organizations")
    .select("id")
    .eq("join_code", catalog.demo.join_code)
    .maybeSingle();
  if (org) {
    const op = await db
      .from("org_packs")
      .upsert(packIds.map((pack_id) => ({ org_id: org.id, pack_id })), { ignoreDuplicates: true });
    if (op.error) throw new Error(`demo packs: ${op.error.message}`);

    const { data: assigned } = await db
      .from("assignments")
      .select("course_id")
      .eq("org_id", org.id)
      .is("learner_id", null)
      .is("job_role_id", null)
      .is("location_id", null);
    const have = new Set((assigned ?? []).map((a) => a.course_id));
    const add = catalog.courses
      .map((slug) => ids.get(slug))
      .filter((id) => id && !have.has(id))
      .map((course_id) => ({ org_id: org.id, course_id }));
    if (add.length) {
      const res = await db.from("assignments").insert(add);
      if (res.error) throw new Error(`demo assignments: ${res.error.message}`);
    }
    console.log(`[courses] demo team: ${add.length} new assignments`);
  }

  const ok = catalog.courses.length - failed.length;
  console.log(`[courses] ${ok} of ${catalog.courses.length} courses published, ${catalog.packs.length} packs`);
}

async function syncCourse(db, slug, bySlug) {
  const html = await readFile(join(ROOT, "lottie", slug, "bilingual.html"));
  const head = html.toString("utf8", 0, Math.min(html.length, 4_000_000));
  const titles = head.match(/T=\{en:("(?:[^"\\]|\\.)*"),es:("(?:[^"\\]|\\.)*")\}/);
  const title = titles ? JSON.parse(titles[1]) : head.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || slug;
  const title_es = titles ? JSON.parse(titles[2]) : null;
  const minutes = Number(head.match(/minutes:(\d+)/)?.[1]) || null;

  const version = bySlug.get(slug)?.version ?? 1;
  const storage_path = `lottie/${slug}/v${version}/bilingual.html`;
  const up = await db.storage
    .from("courses")
    .upload(storage_path, html, { contentType: "text/html; charset=utf-8", upsert: true });
  if (up.error) throw new Error(`upload: ${up.error.message}`);

  const { data: course, error } = await db
    .from("courses")
    .upsert(
      {
        slug,
        title,
        title_es,
        minutes,
        series: "lottie",
        storage_path,
        // New courses go live; existing ones keep the owner portal's Live/Hidden switch.
        ...(bySlug.has(slug) ? {} : { is_published: true }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`course row: ${error.message}`);

  const badge = await db.from("badges").upsert(
    {
      slug,
      course_id: course.id,
      name: `${title} pearl`,
      name_es: title_es ? `Perla de ${title_es}` : null,
    },
    { onConflict: "slug" },
  );
  if (badge.error) throw new Error(`badge: ${badge.error.message}`);
}

main().catch((e) => console.error(`[courses] stopped: ${e.message}`));
