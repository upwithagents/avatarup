// Smoke test for the customizer page. Requires `pnpm dev` running.
// Usage: node apps/web/e2e/customizer-smoke.mjs [baseUrl]
//
// Covers the visual-quality-pass surface added on top of the POC: gender
// presets, grouped/collapsible morph sections, skin texture presets, and
// camera view presets. Deliberately checks DOM/state changes (slider
// values, aria-expanded, absence of page errors) rather than pixels, so it
// stays robust across the studio-lighting/material changes.
import { chromium } from 'playwright';

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';

// Known cold-launch flake: the first WebGL context creation right after a
// fresh `pnpm dev` start occasionally no-ops on some GPUs/drivers. One retry
// of the whole run absorbs that without masking real regressions (a genuine
// failure reproduces on the retry too).
const MAX_ATTEMPTS = 2;

async function runOnce() {
  const attemptFailures = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
      attemptFailures.push('no <canvas> rendered');
    });

    const webgl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
    });
    if (!webgl) attemptFailures.push('canvas has no WebGL context');

    const sliders = page.locator('input[type="range"]');
    if ((await sliders.count()) === 0) {
      attemptFailures.push('no morph sliders found');
    } else {
      await sliders.first().fill('1');
    }

    // --- Gender preset: clicking "Female" changes the feminine slider ---
    const genderGroup = page.locator('[role="group"][aria-label="Gender preset"]');
    if ((await genderGroup.count()) === 0) {
      attemptFailures.push('no gender preset button group found');
    } else {
      const femaleButton = genderGroup.getByRole('button', { name: 'Female', exact: true });
      if ((await femaleButton.count()) === 0) {
        attemptFailures.push('no "Female" gender preset button found');
      } else {
        // The feminine morph lives in the "Body" group, which is expanded
        // by default, so its slider is already in the DOM.
        const feminineSlider = page
          .locator('details', { has: page.locator('summary', { hasText: 'Body' }) })
          .locator('label', { hasText: 'Feminine' })
          .locator('input[type="range"]');

        if ((await feminineSlider.count()) === 0) {
          attemptFailures.push('feminine morph slider not found to verify gender preset');
        } else {
          // Force a known starting value distinct from the Female preset's
          // target (1) so the click's effect is unambiguous, regardless of
          // whatever the slider-fill check above happened to land on.
          await feminineSlider.fill('0');
          const before = await feminineSlider.inputValue();

          await femaleButton.click();
          await page.waitForTimeout(200);
          const after = await feminineSlider.inputValue();

          if (after !== '1') {
            attemptFailures.push(
              `clicking "Female" did not set feminine morph to 1 (got ${after})`
            );
          } else if (before === after) {
            attemptFailures.push('feminine morph slider value did not change after "Female" click');
          }
        }
      }
    }

    // --- Morph groups: a collapsed group (e.g. "Face") can be expanded ---
    const faceGroup = page.locator('details', {
      has: page.locator('summary', { hasText: 'Face' }),
    });
    if ((await faceGroup.count()) === 0) {
      attemptFailures.push('no "Face" morph group section found');
    } else {
      const isOpenBefore = await faceGroup.evaluate((el) => el.hasAttribute('open'));
      if (isOpenBefore) {
        attemptFailures.push('expected "Face" morph group to be collapsed by default');
      }
      await faceGroup.locator('summary', { hasText: 'Face' }).click();
      await page.waitForTimeout(100);
      const isOpenAfter = await faceGroup.evaluate((el) => el.hasAttribute('open'));
      if (!isOpenAfter) {
        attemptFailures.push('clicking "Face" group summary did not expand it');
      } else {
        const revealedSliders = faceGroup.locator('input[type="range"]');
        if ((await revealedSliders.count()) === 0) {
          attemptFailures.push('expanded "Face" group revealed no sliders');
        }
      }
    }

    // --- Skin texture preset: a swatch exists and applies without error ---
    const textureGroup = page.locator('[role="group"][aria-label="Skin texture"]');
    if ((await textureGroup.count()) === 0) {
      attemptFailures.push('no skin texture preset group found');
    } else {
      const swatches = textureGroup.locator('button[title]');
      if ((await swatches.count()) === 0) {
        attemptFailures.push('no skin texture preset swatches found');
      } else {
        const errorsBefore = pageErrors.length;
        await swatches.first().click();
        await page.waitForTimeout(300);
        const pressed = await swatches.first().getAttribute('aria-pressed');
        if (pressed !== 'true') {
          attemptFailures.push('clicking a skin texture preset did not mark it pressed');
        }
        if (pageErrors.length > errorsBefore) {
          attemptFailures.push('applying a skin texture preset threw a page error');
        }
      }
    }

    // --- Camera presets: Face/Torso/Full/Reset buttons exist and work ---
    // These share labels with the morph group summaries above, so scope to
    // the viewport overlay (not the aside panel) to avoid ambiguity.
    const cameraBar = page.locator('main .absolute.bottom-4.left-4');
    if ((await cameraBar.count()) === 0) {
      attemptFailures.push('no camera preset button bar found');
    } else {
      for (const label of ['Face', 'Torso', 'Full', 'Reset']) {
        const button = cameraBar.getByRole('button', { name: label, exact: true });
        if ((await button.count()) === 0) {
          attemptFailures.push(`no camera preset button "${label}" found`);
          continue;
        }
        const errorsBefore = pageErrors.length;
        await button.click();
        await page.waitForTimeout(150);
        if (pageErrors.length > errorsBefore) {
          attemptFailures.push(`clicking camera preset "${label}" threw a page error`);
        }
      }
    }

    // Give React a beat to settle, then check for any accumulated runtime errors.
    await page.waitForTimeout(300);
    if (pageErrors.length > 0) {
      attemptFailures.push(`page errors: ${pageErrors.join(' | ')}`);
    }
  } catch (err) {
    attemptFailures.push(`navigation failed: ${err.message}`);
  } finally {
    await browser.close();
  }

  return attemptFailures;
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
