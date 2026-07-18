// Smoke test for the avatar import/view page — the app's primary flow.
// Requires `pnpm dev` running. Usage: node apps/web/e2e/customizer-smoke.mjs [baseUrl]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE_URL = process.argv[2] ?? 'http://localhost:3000/avatarup';
const SAMPLE_AVATAR = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'sample-imported-avatar.glb'
);

// Known cold-launch flake: the first WebGL context creation right after a
// fresh `pnpm dev` start occasionally no-ops on some GPUs/drivers. One
// retry of the whole run absorbs that without masking real regressions.
const MAX_ATTEMPTS = 2;

async function runOnce() {
  const failures = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // `domcontentloaded` fires once the HTML is parsed, but this page's file
    // input only gets its onChange handler once the client component
    // hydrates. setInputFiles() acts on the raw DOM node regardless of
    // hydration state, so calling it too early sets the input's files with
    // no listener attached yet and the upload silently no-ops. A short
    // settle absorbs that race.
    await page.waitForTimeout(500);

    // --- Empty state: upload control visible before any avatar is stored ---
    const uploadButton = page.getByRole('button', { name: 'Upload avatar (.glb)' });
    if ((await uploadButton.count()) === 0) {
      failures.push('empty-state upload button not found');
    } else {
      await page.locator('input[type="file"]').setInputFiles(SAMPLE_AVATAR);
      await page.waitForTimeout(1500); // parse + persist + first render

      await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
        failures.push('no <canvas> rendered after import');
      });

      const replaceButton = page.getByRole('button', { name: 'Replace avatar' });
      if ((await replaceButton.count()) === 0) {
        failures.push('"Replace avatar" button not found after import');
      }

      for (const label of ['Face', 'Torso', 'Full', 'Reset']) {
        const button = page
          .locator('main .absolute.bottom-4.left-4')
          .getByRole('button', { name: label, exact: true });
        if ((await button.count()) === 0) {
          failures.push(`no camera preset button "${label}" found`);
          continue;
        }
        const errorsBefore = pageErrors.length;
        await button.click();
        await page.waitForTimeout(150);
        if (pageErrors.length > errorsBefore) {
          failures.push(`clicking camera preset "${label}" threw a page error`);
        }
      }
    }

    // --- Reload: the imported avatar persists across a full page reload ---
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
      failures.push('no <canvas> rendered after reload (avatar did not persist)');
    });

    await page.waitForTimeout(300);
    if (pageErrors.length > 0) {
      failures.push(`page errors: ${pageErrors.join(' | ')}`);
    }
  } catch (err) {
    failures.push(`navigation failed: ${err.message}`);
  } finally {
    await browser.close();
  }

  return failures;
}

let lastFailures = [];
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  lastFailures = await runOnce();
  if (lastFailures.length === 0) break;
  if (attempt < MAX_ATTEMPTS) {
    console.error(`Attempt ${attempt} failed, retrying once (known cold-launch WebGL flake)...`);
  }
}

if (lastFailures.length > 0) {
  console.error('SMOKE FAIL:');
  for (const f of lastFailures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('SMOKE PASS');
