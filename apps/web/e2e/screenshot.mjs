// Captures screenshots of the customizer scene for visual review.
// Requires `pnpm dev` running.
// Usage: node apps/web/e2e/screenshot.mjs [outDir] [baseUrl] [view] \
//          [--morph name=value ...] [--click "Button label" ...] \
//          [--summary "Group label" ...] [--name shot.png]
//   view: "Face" | "Torso" | "Full" -> clicks that overlay button, saves <view>.png
//         "after-orbit" -> clicks Full, drags to orbit, saves after-orbit.png
//         omitted -> default + close-up sequence
//   --morph name=value (repeatable): after load, sets that morph target
//         influence on every mesh via the window.__avatarupScene e2e hook.
//         Useful for morphs that have no UI slider yet.
//   --click "label" (repeatable): clicks a real <button> by its accessible
//         name (e.g. the panel's Female/Male gender toggle) before the shot.
//   --summary "label" (repeatable): clicks a <details><summary> by its text
//         (e.g. a collapsible morph group) to expand/collapse it.
//   --upload path/to/file.png (repeatable): sets the given file on the
//         page's first <input type="file"> via Playwright's setInputFiles
//         (bypasses the native file-picker dialog entirely, so it works
//         headless) — e.g. the skin-texture upload input.
//   --name shot.png: output file name (required with --morph/--click/
//         --summary/--upload, optional with a view; ignored by the default
//         two-shot sequence).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const positional = [];
const morphs = [];
const clicks = [];
const summaries = [];
const uploads = [];
let outName = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--morph') {
    const [name, value] = String(argv[++i] ?? '').split('=');
    if (!name || Number.isNaN(Number(value))) {
      console.error('--morph expects name=value (value numeric)');
      process.exit(1);
    }
    morphs.push([name, Number(value)]);
  } else if (argv[i] === '--click') {
    clicks.push(argv[++i]);
  } else if (argv[i] === '--summary') {
    summaries.push(argv[++i]);
  } else if (argv[i] === '--upload') {
    uploads.push(argv[++i]);
  } else if (argv[i] === '--name') {
    outName = argv[++i];
  } else {
    positional.push(argv[i]);
  }
}

const OUT_DIR = positional[0] ?? '/tmp/avatarup-shots';
const BASE_URL = positional[1] ?? 'http://localhost:3000/avatarup';
const VIEW_ARG = positional[2];
const SETTLE_MS = 3000; // env map + soft shadow warmup

if ((morphs.length > 0 || clicks.length > 0 || summaries.length > 0 || uploads.length > 0) && !outName) {
  console.error('--morph/--click/--summary/--upload require --name <file.png>');
  process.exit(1);
}

/** Click real UI elements (panel buttons, <summary> group headers) in order. */
async function applyClicks() {
  for (const label of clicks) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(300);
  }
  for (const label of summaries) {
    const summary = page.locator('summary', { hasText: label }).first();
    await summary.click();
    // scrollIntoViewIfNeeded() is a no-op when any sliver of the element is
    // already visible, which leaves the newly-expanded sliders below the
    // fold — force it to the top of the scrollable panel instead.
    await page.evaluate((text) => {
      const el = [...document.querySelectorAll('summary')].find((s) =>
        s.textContent?.includes(text)
      );
      el?.scrollIntoView({ block: 'start' });
    }, label);
    await page.waitForTimeout(200);
  }
}

/** Set files on the page's file input(s) in order (e.g. skin-texture
 * upload) — setInputFiles works on a hidden input without opening a native
 * dialog, so this runs fine headless. */
async function applyUploads() {
  for (const path of uploads) {
    await page.locator('input[type="file"]').first().setInputFiles(path);
    // Async: validate -> save blob to IndexedDB -> update profile -> load
    // texture off an object URL.
    await page.waitForTimeout(700);
  }
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/** Set morph influences on every mesh of the loaded scene (by target name). */
async function applyMorphs() {
  if (morphs.length === 0) return;
  const applied = await page.evaluate((pairs) => {
    const scene = window.__avatarupScene;
    if (!scene) return -1;
    let count = 0;
    scene.traverse((obj) => {
      if (!obj.morphTargetDictionary || !obj.morphTargetInfluences) return;
      for (const [name, value] of pairs) {
        const index = obj.morphTargetDictionary[name];
        if (index === undefined) continue;
        obj.morphTargetInfluences[index] = value;
        count++;
      }
    });
    return count;
  }, morphs);
  if (applied === -1) throw new Error('window.__avatarupScene missing — is the scene loaded?');
  if (applied === 0) throw new Error(`no mesh has morphs ${morphs.map(([n]) => n).join(', ')}`);
  console.log(`applied ${morphs.length} morph(s) to ${applied} mesh/morph slots`);
  await page.waitForTimeout(400);
}

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // On the import/view page no <canvas> exists until an avatar is uploaded
  // (the empty state is just an upload button) — apply uploads first so the
  // canvas has a chance to appear. On pages that already render a canvas
  // (e.g. the legacy customizer's default avatar) this is a no-op.
  if (uploads.length > 0) {
    // `domcontentloaded` fires once the HTML is parsed, but the file input
    // only gets its onChange handler once the client component hydrates.
    // setInputFiles() acts on the raw DOM node regardless of hydration
    // state, so calling it too early silently no-ops. A short settle
    // absorbs that race.
    await page.waitForTimeout(500);
    await applyUploads();
  }
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS);

  if (VIEW_ARG === 'after-orbit') {
    // Go to a preset, then drag-orbit, to prove the controls aren't stuck
    // after an imperative camera move.
    await page.getByRole('button', { name: 'Full', exact: true }).click();
    await page.waitForTimeout(1200);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(cx + 260, cy - 60, { steps: 16 });
      await page.mouse.up({ button: 'left' });
      await page.waitForTimeout(500);
      // Wheel-zoom too — brief requires "orbit/zoom still works between presets".
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -120);
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(300);
    }
    const shot = join(OUT_DIR, 'after-orbit.png');
    await page.screenshot({ path: shot });
    console.log(`saved ${shot}`);
    await browser.close();
    process.exit(0);
  }

  if (VIEW_ARG) {
    const button = page.getByRole('button', { name: VIEW_ARG, exact: true });
    await button.click();
    await page.waitForTimeout(1200); // smooth CameraControls transition
    await applyClicks();
    await applyMorphs();
    const shot = join(OUT_DIR, outName ?? `${VIEW_ARG.toLowerCase()}.png`);
    await page.screenshot({ path: shot });
    console.log(`saved ${shot}`);
    await browser.close();
    process.exit(0);
  }

  if (morphs.length > 0 || clicks.length > 0 || summaries.length > 0 || uploads.length > 0) {
    await applyClicks();
    await applyMorphs();
    const shot = join(OUT_DIR, outName);
    await page.screenshot({ path: shot });
    console.log(`saved ${shot}`);
    await browser.close();
    process.exit(0);
  }

  const defaultShot = join(OUT_DIR, 'default.png');
  await page.screenshot({ path: defaultShot });
  console.log(`saved ${defaultShot}`);

  // Face close-up: dolly in with wheel events (OrbitControls zoom), then
  // right-button drag to pan the orbit target up to head height so the whole
  // head fits, straight-on, with a little headroom.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(50);
    }
    // Pan: dragging down with the right button moves the target up.
    for (const stroke of [220, 220]) {
      await page.mouse.move(cx, cy - stroke / 2);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(cx, cy + stroke / 2, { steps: 12 });
      await page.mouse.up({ button: 'right' });
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(800);
    const closeShot = join(OUT_DIR, 'closeup.png');
    await page.screenshot({ path: closeShot });
    console.log(`saved ${closeShot}`);
  }
} finally {
  await browser.close();
}
