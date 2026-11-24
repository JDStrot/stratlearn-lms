#!/usr/bin/env node
// Makes the card picture for each course from its own Lottie title screen.
//
// Opens courses/lottie/<slug>/bilingual.html in a headless browser, finds the
// title art (.th-hero), freezes its animations with eyes open, and saves
// public/course-art/<slug>.jpg. The learner home shows that picture on the
// course card. Run it after adding or changing courses:
//
//   node scripts/make-course-art.mjs            (all courses)
//   node scripts/make-course-art.mjs fire-safety (one course)
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { mkdir, readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const COURSES = join(ROOT, "courses/lottie");
const OUT = join(ROOT, "public/course-art");

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : (await readdir(COURSES)).sort();
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 520, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  reducedMotion: "reduce",
});

const missing = [];
for (const slug of slugs) {
  await page.goto(pathToFileURL(join(COURSES, slug, "bilingual.html")).href);
  let hero = null;
  for (let i = 0; i < 40 && !hero; i++) {
    for (const frame of page.frames()) {
      const h = await frame.$(".th-hero").catch(() => null);
      if (h) {
        hero = { frame, h };
        break;
      }
    }
    if (!hero) await page.waitForTimeout(250);
  }
  if (!hero) {
    missing.push(slug);
    console.warn(`no title art: ${slug}`);
    continue;
  }
  // Freeze every animation at its start so nobody is caught mid-blink.
  await hero.frame.evaluate(() => {
    document.querySelectorAll(".th-hero svg").forEach((s) => {
      s.querySelectorAll("animate, animateTransform, animateMotion").forEach((a) => a.remove());
      s.pauseAnimations?.();
      s.setCurrentTime?.(0);
    });
    const st = document.createElement("style");
    st.textContent = ".th-hero *{animation:none!important;transition:none!important}.th-hero{border-radius:0!important;box-shadow:none!important;max-height:none!important}";
    document.head.appendChild(st);
    // Hide anything floating over the art (language switch, toasts, top bar).
    const hero = document.querySelector(".th-hero");
    const r = hero.getBoundingClientRect();
    for (const el of document.querySelectorAll("body *")) {
      if (el.contains(hero) || hero.contains(el)) continue;
      const pos = getComputedStyle(el).position;
      if (pos !== "fixed" && pos !== "absolute" && pos !== "sticky") continue;
      const b = el.getBoundingClientRect();
      if (b.width && b.height && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) {
        el.style.visibility = "hidden";
      }
    }
  });
  await page.waitForTimeout(150);
  await hero.h.screenshot({ path: join(OUT, `${slug}.jpg`), type: "jpeg", quality: 82 });
  console.log(`ok ${slug}`);
}
await browser.close();
if (missing.length) console.warn(`${missing.length} without title art: ${missing.join(", ")}`);
