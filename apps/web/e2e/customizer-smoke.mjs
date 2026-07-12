// Smoke test for the customizer page. Requires `pnpm dev` running.
// Usage: node apps/web/e2e/customizer-smoke.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const failures = [];

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
    failures.push('no <canvas> rendered');
  });

  const webgl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  });
  if (!webgl) failures.push('canvas has no WebGL context');

  const sliders = page.locator('input[type="range"]');
  if ((await sliders.count()) === 0) {
    failures.push('no morph sliders found');
  } else {
    await sliders.first().fill('1');
  }

  // Give React a beat to apply the change, then check for runtime errors.
  await page.waitForTimeout(500);
  if (pageErrors.length > 0) {
    failures.push(`page errors: ${pageErrors.join(' | ')}`);
  }
} catch (err) {
  failures.push(`navigation failed: ${err.message}`);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error('SMOKE FAIL:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('SMOKE PASS');
