#!/usr/bin/env node
// Uploads Lottie course files to Supabase Storage and adds them to the catalog.
//
//   node --env-file=.env.local scripts/upload-courses.mjs <courses-folder> [slug ...]
//
// <courses-folder> holds one folder per course (e.g. ~/Documents/LMS/courses),
// each with a bilingual.html. Folders starting with "_" are skipped.
// Before launch, re-running replaces the file in place (version 1). After
// launch, bump the version so learners' records keep the version they took.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [, , root, ...only] = process.argv;
if (!root) {
  console.error("Usage: node --env-file=.env.local scripts/upload-courses.mjs <courses-folder> [slug ...]");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const slugs = only.length
  ? only
  : (await readdir(root)).filter((n) => !n.startsWith("_") && /^[a-z0-9-]+$/.test(n));

let ok = 0;
for (const slug of slugs) {
  const file = join(root, slug, "bilingual.html");
  try {
    await stat(file);
  } catch {
    console.warn(`skip ${slug}: no bilingual.html`);
    continue;
  }
  const html = await readFile(file);
  const title =
    html.toString("utf8", 0, 20000).match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || slug;

  const { data: existing } = await db.from("courses").select("version").eq("slug", slug).maybeSingle();
  const version = existing?.version ?? 1;
  const path = `lottie/${slug}/v${version}/bilingual.html`;

  const up = await db.storage
    .from("courses")
    .upload(path, html, { contentType: "text/html; charset=utf-8", upsert: true });
  if (up.error) {
    console.error(`fail ${slug}: ${up.error.message}`);
    continue;
  }

  const row = { slug, storage_path: path, updated_at: new Date().toISOString() };
  const res = existing
    ? await db.from("courses").update(row).eq("slug", slug)
    : await db.from("courses").insert({ ...row, title, is_published: true });
  if (res.error) {
    console.error(`fail ${slug}: ${res.error.message}`);
    continue;
  }
  ok++;
  console.log(`ok   ${slug}  (${(html.length / 1e6).toFixed(1)} MB)`);
}
console.log(`\n${ok} of ${slugs.length} courses uploaded.`);
