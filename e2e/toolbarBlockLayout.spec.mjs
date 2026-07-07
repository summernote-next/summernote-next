import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const variants = [
  { name: 'bs5', url: `${baseUrl}/summernote-next/full.html` },
  { name: 'classic', url: `${baseUrl}/summernote-next-classic/full.html` },
];

const tests = [
  {
    name: 'icon-buttons-are-square-blocks-with-centred-svg',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      const layout = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.note-toolbar .note-btn:has(> .note-icon)'));
        if (buttons.length === 0) {
          return { ok: false, reason: 'no icon buttons' };
        }

        const sample = buttons.slice(0, 6).map((btn) => {
          const btnRect = btn.getBoundingClientRect();
          const icon = btn.querySelector(':scope > .note-icon');
          const svg = icon && icon.querySelector(':scope > svg');
          const iconRect = icon ? icon.getBoundingClientRect() : null;
          const svgRect = svg ? svg.getBoundingClientRect() : null;
          return {
            label: btn.getAttribute('aria-label') || btn.title || '',
            btnWidth: btnRect.width,
            btnHeight: btnRect.height,
            iconWidth: iconRect ? iconRect.width : 0,
            iconHeight: iconRect ? iconRect.height : 0,
            svgWidth: svgRect ? svgRect.width : 0,
            svgHeight: svgRect ? svgRect.height : 0,
            svgPct: svgRect && iconRect ? Math.round((svgRect.width / iconRect.width) * 100) : 0,
            square: btnRect.width === btnRect.height,
          };
        });

        return { ok: sample.every((s) => s.square), sample };
      });

      if (!layout.ok) {
        throw new Error(`icon buttons are not square: ${JSON.stringify(layout.sample)}`);
      }

      // Every sampled icon SVG should fit within roughly 70% of its wrapper.
      const offBy = layout.sample.filter((s) => Math.abs(s.svgPct - 70) > 2);
      if (offBy.length > 0) {
        throw new Error(`icons outside the 70% target: ${JSON.stringify(offBy)}`);
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-toolbar-square-blocks-${timestamp()}.png`),
        fullPage: false,
      });

      return layout.sample.map((s) => ({ label: s.label, pct: s.svgPct }));
    },
  },
  {
    name: 'code-icon-uses-80-percent-width-override',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-code svg', { timeout: 5000 });

      const measurement = await page.evaluate(() => {
        const icon = document.querySelector('.note-toolbar .note-icon-code');
        const svg = icon && icon.querySelector(':scope > svg');
        if (!icon || !svg) {
          return { ok: false, reason: 'code icon missing' };
        }
        const iconRect = icon.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const pct = (svgRect.width / iconRect.width) * 100;
        return {
          ok: Math.abs(pct - 80) < 2,
          iconWidth: iconRect.width,
          svgWidth: svgRect.width,
          pct: Math.round(pct),
        };
      });

      if (!measurement.ok) {
        throw new Error(`code icon is not 80% wide: ${JSON.stringify(measurement)}`);
      }

      return measurement;
    },
  },
  {
    name: 'paragraph-dropdown-items-are-square-blocks',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      await page.click('button[aria-label="Paragraph"]');
      await page.waitForSelector('.note-para .note-dropdown-menu.show .note-btn', { timeout: 5000 });

      const layout = await page.evaluate(() => {
        const items = Array.from(
          document.querySelectorAll('.note-para .note-dropdown-menu.show .note-btn'),
        );
        return items.map((btn) => {
          const rect = btn.getBoundingClientRect();
          return {
            label: btn.getAttribute('aria-label') || btn.title || '',
            width: rect.width,
            height: rect.height,
            square: rect.width === rect.height,
          };
        });
      });

      const nonSquare = layout.filter((item) => !item.square);
      if (nonSquare.length > 0) {
        throw new Error(`dropdown menu items not square: ${JSON.stringify(nonSquare)}`);
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-toolbar-paragraph-dropdown-${timestamp()}.png`),
        fullPage: false,
      });

      return layout.map((item) => item.label);
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});

let pass = 0;
let fail = 0;
const failures = [];

for (const variant of variants) {
  for (const test of tests) {
    const page = await context.newPage();
    try {
      await page.goto(variant.url, { waitUntil: 'networkidle' });
      const result = await test.run(page);
      console.log(`PASS  ${variant.name} ${test.name}`, result);
      pass += 1;
    } catch (error) {
      console.error(`FAIL  ${variant.name} ${test.name}:`, error.message);
      failures.push({ name: `${variant.name} ${test.name}`, error: error.message });
      fail += 1;
    } finally {
      await page.close();
    }
  }
}

await browser.close();

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}