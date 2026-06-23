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
  { name: 'bs5', url: `${baseUrl}/summernote-next/default.html` },
  { name: 'classic', url: `${baseUrl}/summernote-next-classic/default.html` },
];

const tests = [
  {
    name: 'icons-render-as-inline-svg-without-font',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      const audit = await page.evaluate(() => {
        const toolbar = document.querySelector('.note-toolbar');
        if (!toolbar) {
          return { ok: false, reason: 'no toolbar' };
        }
        const icons = Array.from(toolbar.querySelectorAll('[class*="note-icon-"]'));
        if (icons.length === 0) {
          return { ok: false, reason: 'no icon elements in toolbar' };
        }
        let inlineCount = 0;
        let empty = 0;
        for (const el of icons) {
          const svg = el.querySelector(':scope > svg');
          if (svg) {
            inlineCount += 1;
          } else {
            empty += 1;
          }
        }
        return {
          ok: inlineCount > 0 && empty === 0,
          iconCount: icons.length,
          inlineCount,
          empty,
          loadedFonts: Array.from(document.fonts).map((f) => ({
            family: f.family,
            status: f.status,
          })),
        };
      });

      if (!audit.ok) {
        throw new Error(`inline-svg check failed: ${JSON.stringify(audit)}`);
      }

      const summernoteFont = audit.loadedFonts.find((f) => f.family === 'summernote');
      if (summernoteFont) {
        throw new Error(`summernote font should not be requested, got ${JSON.stringify(summernoteFont)}`);
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-icons-inline-${timestamp()}.png`),
        fullPage: true,
      });

      return { iconCount: audit.iconCount, inlineCount: audit.inlineCount };
    },
  },
  {
    name: 'icon-glyphs-inherit-currentColor',
    async run(page) {
      await page.waitForSelector('.note-icon-bold svg', { timeout: 5000 });

      const fills = await page.evaluate(() => {
        const i = document.querySelector('.note-icon-bold');
        const svg = i && i.querySelector(':scope > svg');
        const path = svg && svg.querySelector('path');
        return {
          svgAttributeFill: svg ? svg.getAttribute('fill') : null,
          svgFill: svg ? window.getComputedStyle(svg).fill : null,
          pathFill: path ? window.getComputedStyle(path).fill : null,
        };
      });

      if (fills.svgAttributeFill !== 'currentColor') {
        throw new Error(`expected svg fill="currentColor", got ${fills.svgAttributeFill}`);
      }
      if (!fills.pathFill || fills.pathFill === 'none') {
        throw new Error(`expected path to have a non-none computed fill, got ${fills.pathFill}`);
      }
      if (fills.pathFill !== fills.svgFill) {
        throw new Error(`expected path to inherit the svg fill (${fills.svgFill}), got ${fills.pathFill}`);
      }

      return fills;
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
