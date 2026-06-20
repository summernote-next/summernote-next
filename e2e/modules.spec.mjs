import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const fullUrl = `${baseUrl}/summernote-next/full.html`;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const tests = [
  {
    name: 'link-dialog-inserts-anchor',
    async run(page) {
      await page.click('.note-editable');
      await page.locator('.note-insert button:has(i.note-icon-link)').click();
      await page.waitForSelector('.note-link-dialog-modal', { state: 'visible', timeout: 5000 });
      await page.fill('.note-link-text', 'Example');
      await page.fill('.note-link-url', 'https://example.com');
      await page.click('.note-link-btn');
      await page.waitForSelector('.note-editable a[href*="example.com"]', { timeout: 5000 });
      await page.screenshot({ path: resolve(screenshotDir, `playwright-link-dialog-${timestamp()}.png`), fullPage: true });
      return { linkInserted: true };
    },
  },
  {
    name: 'image-dialog-handle-and-popover',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const win = window;
        const img = win.document.createElement('img');
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAAC+NMs+AAAAFklEQVQYV2P8z8BQz0BFgHHUCuqGCwBx9QoL/cMk0QAAAABJRU5ErkJggg==';
        img.alt = 'dot';
        win.summernote.invoke('#all-features-editor', 'insertNode', img);
      });
      await page.waitForSelector('.note-editable img', { timeout: 5000 });
      await page.click('.note-editable img');
      await page.waitForSelector('.note-handle .note-control-selection', { state: 'visible', timeout: 5000 });
      await page.waitForSelector('.note-image-popover', { state: 'visible', timeout: 5000 });
      await page.screenshot({ path: resolve(screenshotDir, `playwright-image-handle-${timestamp()}.png`), fullPage: true });
      return { handleVisible: true };
    },
  },
  {
    name: 'video-dialog-embeds-iframe',
    async run(page) {
      await page.click('.note-editable');
      await page.locator('.note-insert button:has(i.note-icon-video)').click();
      await page.waitForSelector('.note-video-url', { state: 'visible', timeout: 5000 });
      await page.fill('.note-video-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await page.click('.note-video-btn');
      await page.waitForSelector('.note-editable iframe.note-video-clip', { timeout: 5000 });
      return { videoEmbedded: true };
    },
  },
  {
    name: 'table-popover-adds-row',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const win = window;
        win.summernote.invoke('#all-features-editor', 'insertTable', '2x2');
      });
      await page.waitForSelector('.note-editable td', { timeout: 5000 });
      await page.dispatchEvent('.note-editable td', 'mousedown');
      await page.waitForSelector('.note-table-popover', { state: 'visible', timeout: 5000 });
      await page.locator('.note-table-popover button:has(i.note-icon-row-below)').click();
      const rowCount = await page.locator('.note-editable tr').count();
      if (rowCount !== 3) {
        throw new Error(`expected 3 rows after adding one, got ${rowCount}`);
      }
      await page.screenshot({ path: resolve(screenshotDir, `playwright-table-popover-${timestamp()}.png`), fullPage: true });
      return { rowCount };
    },
  },
  {
    name: 'help-dialog-lists-shortcuts',
    async run(page) {
      await page.locator('.note-view button:has(i.note-icon-question)').click();
      await page.waitForSelector('.note-help-dialog-modal', { state: 'visible', timeout: 5000 });
      await page.waitForSelector('.note-help-dialog kbd', { timeout: 5000 });
      await page.screenshot({ path: resolve(screenshotDir, `playwright-help-dialog-${timestamp()}.png`), fullPage: true });
      return { helpOpen: true };
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

let pass = 0;
let fail = 0;
const failures = [];

for (const test of tests) {
  const page = await context.newPage();
  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('.note-editor', { timeout: 5000 });
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
