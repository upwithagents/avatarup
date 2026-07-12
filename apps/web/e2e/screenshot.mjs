// Captures screenshots of the customizer scene for visual review.
// Requires `pnpm dev` running.
// Usage: node apps/web/e2e/screenshot.mjs [outDir] [baseUrl] [view]
//   view: "Face" | "Torso" | "Full" -> clicks that overlay button, saves task-2-<view>.png
//         "after-orbit" -> clicks Full, drags to orbit, saves task-2-after-orbit.png
//         omitted -> original task-1 default + close-up sequence
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = process.argv[2] ?? '.superpowers/sdd/shots';
const BASE_URL = process.argv[3] ?? 'http://localhost:3000';
const SETTLE_MS = 3000; // env map + soft shadow warmup

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Set to a view-preset name (e.g. "face") to click that overlay button and
// capture a single `task-2-<view>.png` instead of the default task-1 sequence.
const VIEW_ARG = process.argv[4];

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    const shot = join(OUT_DIR, 'task-2-after-orbit.png');
    await page.screenshot({ path: shot });
    console.log(`saved ${shot}`);
    await browser.close();
    process.exit(0);
  }

  if (VIEW_ARG) {
    const button = page.getByRole('button', { name: VIEW_ARG, exact: true });
    await button.click();
    await page.waitForTimeout(1200); // smooth CameraControls transition
    const shot = join(OUT_DIR, `task-2-${VIEW_ARG.toLowerCase()}.png`);
    await page.screenshot({ path: shot });
    console.log(`saved ${shot}`);
    await browser.close();
    process.exit(0);
  }

  const defaultShot = join(OUT_DIR, 'task-1-default.png');
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
    const closeShot = join(OUT_DIR, 'task-1-closeup.png');
    await page.screenshot({ path: closeShot });
    console.log(`saved ${closeShot}`);
  }
} finally {
  await browser.close();
}
