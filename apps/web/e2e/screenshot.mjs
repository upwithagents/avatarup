// Captures screenshots of the customizer scene for visual review.
// Requires `pnpm dev` running.
// Usage: node apps/web/e2e/screenshot.mjs [outDir] [baseUrl]
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = process.argv[2] ?? '.superpowers/sdd/shots';
const BASE_URL = process.argv[3] ?? 'http://localhost:3000';
const SETTLE_MS = 3000; // env map + soft shadow warmup

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS);

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
