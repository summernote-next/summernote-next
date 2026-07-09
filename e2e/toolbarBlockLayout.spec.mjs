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
    name: 'icon-buttons-are-natural-btn-sm-size',
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
            btnW: btnRect.width,
            btnH: btnRect.height,
            btnPctH: Math.round((btnRect.height / btnRect.width) * 100),
            iconW: iconRect ? iconRect.width : 0,
            iconH: iconRect ? iconRect.height : 0,
            svgW: svgRect ? svgRect.width : 0,
            svgH: svgRect ? svgRect.height : 0,
            svgPct: svgRect && iconRect ? Math.round((svgRect.width / iconRect.width) * 100) : 0,
          };
        });
        return { ok: true, sample };
      });

      if (!layout.ok) {
        throw new Error(layout.reason);
      }

      // All sampled icons should be approximately square (wrapper is 1em x 1em).
      const offSquare = layout.sample.filter((s) => Math.abs(s.iconW - s.iconH) > 0.5);
      if (offSquare.length > 0) {
        throw new Error(`icon wrappers not square: ${JSON.stringify(offSquare)}`);
      }

      // The SVG should fill the wrapper (default 100%).
      const offSize = layout.sample.filter((s) => Math.abs(s.svgPct - 100) > 2);
      if (offSize.length > 0) {
        throw new Error(`icons not filling wrapper: ${JSON.stringify(offSize)}`);
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-toolbar-natural-${timestamp()}.png`),
        fullPage: false,
      });

      return layout.sample.map((s) => ({ label: s.label, btnW: s.btnW, btnH: s.btnH, svgPct: s.svgPct }));
    },
  },
  {
    name: 'code-icon-is-larger-via-note-icon-lg',
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
        // The .note-icon-lg utility class sizes the SVG at 1.25em while the
        // wrapper stays at 1em, so the rendered glyph is ~25% wider than the
        // default.
        const pct = (svgRect.width / iconRect.width) * 100;
        return {
          ok: pct > 110 && pct < 140,
          iconW: iconRect.width,
          svgW: svgRect.width,
          pct: Math.round(pct),
        };
      });

      if (!measurement.ok) {
        throw new Error(`code icon is not larger via .note-icon-lg: ${JSON.stringify(measurement)}`);
      }

      return measurement;
    },
  },
  {
    name: 'dropdown-toggles-show-carets',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      const carets = await page.evaluate(() => {
        const dropdowns = Array.from(document.querySelectorAll('.note-toolbar .dropdown-toggle:has(> .note-icon)'));
        return dropdowns.slice(0, 4).map((btn) => {
          const rect = btn.getBoundingClientRect();
          const afterStyle = window.getComputedStyle(btn, '::after');
          return {
            label: btn.getAttribute('aria-label') || btn.title || '',
            w: rect.width,
            caretVisible: afterStyle.display !== 'none' && afterStyle.content !== 'none',
          };
        });
      });

      const hidden = carets.filter((c) => !c.caretVisible);
      if (hidden.length > 0) {
        throw new Error(`dropdown toggles without caret: ${JSON.stringify(hidden)}`);
      }

      // Dropdown toggles should be wider than icon-only buttons.
      const iconButtonWidth = await page.evaluate(() => {
        const btn = document.querySelector('.note-toolbar .note-btn-bold');
        return btn ? btn.getBoundingClientRect().width : 0;
      });

      const narrow = carets.filter((c) => c.w <= iconButtonWidth + 1);
      if (narrow.length > 0) {
        throw new Error(`dropdown toggles not wider than icon buttons: ${JSON.stringify(narrow)}`);
      }

      return carets.map((c) => ({ label: c.label, w: c.w }));
    },
  },
  {
    name: 'font-family-and-font-size-match-reference',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      const measurement = await page.evaluate(() => {
        const fontBtn = document.querySelector('.note-toolbar .note-fontname .dropdown-toggle');
        const sizeBtn = document.querySelector('.note-toolbar .note-fontsize .dropdown-toggle');
        const boldBtn = document.querySelector('.note-toolbar .note-btn-bold');
        if (!fontBtn || !sizeBtn || !boldBtn) {
          return { ok: false, reason: 'buttons missing' };
        }
        const fontRect = fontBtn.getBoundingClientRect();
        const sizeRect = sizeBtn.getBoundingClientRect();
        const boldRect = boldBtn.getBoundingClientRect();
        return {
          font: { w: fontRect.width, h: fontRect.height },
          size: { w: sizeRect.width, h: sizeRect.height },
          bold: { w: boldRect.width, h: boldRect.height },
          // The text-based dropdowns must match the icon button height.
          ok: Math.abs(fontRect.height - boldRect.height) < 1
            && Math.abs(sizeRect.height - boldRect.height) < 1,
        };
      });

      if (!measurement.ok) {
        throw new Error(`font dropdowns do not match icon height: ${JSON.stringify(measurement)}`);
      }

      return measurement;
    },
  },
  {
    name: 'super-and-sub-icons-share-baseline',
    async run(page) {
      await page.waitForSelector('.note-toolbar .note-icon-bold svg', { timeout: 5000 });

      const measurement = await page.evaluate(() => {
        const sup = document.querySelector('.note-toolbar .note-btn-superscript .note-icon > svg');
        const sub = document.querySelector('.note-toolbar .note-btn-subscript .note-icon > svg');
        if (!sup || !sub) {
          return { ok: false, reason: 'super/sub icons missing' };
        }
        const supStyle = window.getComputedStyle(sup);
        const subStyle = window.getComputedStyle(sub);
        return {
          ok: supStyle.transform !== 'none'
            && subStyle.transform !== 'none'
            && supStyle.transform !== subStyle.transform,
          supTransform: supStyle.transform,
          subTransform: subStyle.transform,
        };
      });

      if (!measurement.ok) {
        throw new Error(`super/sub do not share a baseline: ${JSON.stringify(measurement)}`);
      }

      return measurement;
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