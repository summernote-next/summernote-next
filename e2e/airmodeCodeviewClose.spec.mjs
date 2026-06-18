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

const tests = [
  {
    name: 'bs5-airmode-codeview-shows-close-button',
    url: `${baseUrl}/summernote-next/airmode.html`,
    async run(page) {
      await page.waitForSelector('.note-editor', { timeout: 5000 });

      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        const p = editable.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        editable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      await page.waitForSelector('.note-air-popover', { state: 'visible', timeout: 5000 });

      await page.click('.note-air-popover .btn-codeview', { force: true });

      const hasCodeviewClass = await page.evaluate(() =>
        document.querySelector('.note-editor').classList.contains('codeview'),
      );
      if (!hasCodeviewClass) {
        throw new Error('editor did not enter codeview mode');
      }

      const closeButton = await page.$('.note-air-codeview-close');
      if (!closeButton) {
        throw new Error('floating close button missing in air mode codeview');
      }

      const isVisible = await closeButton.isVisible();
      if (!isVisible) {
        throw new Error('floating close button is not visible');
      }

      const ariaLabel = await closeButton.getAttribute('aria-label');
      if (!ariaLabel) {
        throw new Error('floating close button missing aria-label');
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-airmode-codeview-${timestamp()}.png`),
        fullPage: true,
      });

      return {
        hasCodeviewClass,
        closeButtonVisible: isVisible,
        ariaLabel,
      };
    },
  },
  {
    name: 'bs5-airmode-codeview-close-button-toggles',
    url: `${baseUrl}/summernote-next/airmode.html`,
    async run(page) {
      await page.waitForSelector('.note-editor', { timeout: 5000 });

      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        const p = editable.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        editable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      await page.waitForSelector('.note-air-popover', { state: 'visible', timeout: 5000 });

      await page.click('.note-air-popover .btn-codeview', { force: true });
      await page.waitForSelector('.note-air-codeview-close');

      await page.click('.note-air-codeview-close', { force: true });

      const codeviewStillActive = await page.evaluate(() =>
        document.querySelector('.note-editor').classList.contains('codeview'),
      );
      if (codeviewStillActive) {
        throw new Error('clicking floating close button did not exit codeview');
      }

      const closeStillThere = await page.$('.note-air-codeview-close');
      if (closeStillThere) {
        throw new Error('floating close button not removed after toggle');
      }

      return { codeviewStillActive, closeStillThere: Boolean(closeStillThere) };
    },
  },
  {
    name: 'bs5-frame-mode-codeview-hides-close-button',
    url: `${baseUrl}/summernote-next/default.html`,
    async run(page) {
      await page.waitForSelector('.note-editor', { timeout: 5000 });
      await page.click('.note-toolbar .btn-codeview');

      const hasCodeviewClass = await page.evaluate(() =>
        document.querySelector('.note-editor').classList.contains('codeview'),
      );
      if (!hasCodeviewClass) {
        throw new Error('editor did not enter codeview mode');
      }

      const closeButton = await page.$('.note-air-codeview-close');
      if (closeButton) {
        throw new Error('floating close button should not appear in frame mode codeview');
      }

      return { hasCodeviewClass, closeButtonShown: Boolean(closeButton) };
    },
  },
  {
    name: 'classic-airmode-codeview-shows-close-button',
    url: `${baseUrl}/summernote-next-classic/airmode.html`,
    async run(page) {
      await page.waitForSelector('.note-editor', { timeout: 5000 });

      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        const p = editable.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        editable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      await page.waitForSelector('.note-air-popover', { state: 'visible', timeout: 5000 });

      await page.click('.note-air-popover .btn-codeview', { force: true });

      const closeButton = await page.waitForSelector('.note-air-codeview-close', { timeout: 2000 });
      if (!closeButton) {
        throw new Error('floating close button missing in classic air mode codeview');
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-classic-airmode-codeview-${timestamp()}.png`),
        fullPage: true,
      });

      return { closeButtonShown: true };
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

for (const test of tests) {
  const page = await context.newPage();
  try {
    await page.goto(test.url, { waitUntil: 'networkidle' });
    const result = await test.run(page);
    console.log(`PASS  ${test.name}`, result);
    pass += 1;
  } catch (error) {
    console.error(`FAIL  ${test.name}:`, error.message);
    failures.push({ name: test.name, error: error.message });
    fail += 1;
  } finally {
    await page.close();
  }
}

await browser.close();

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
