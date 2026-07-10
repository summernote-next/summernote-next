import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const showcaseUrl = `${baseUrl}/summernote-next/plugin-button-styles.html`;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function step(page, label, file) {
  const ts = timestamp();
  const filename = `${file}-${ts}.png`;
  await page.screenshot({ path: resolve(screenshotDir, filename), fullPage: true });
  console.log(`[shot] ${label} -> ${filename}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await context.newPage();

try {
  await page.goto(showcaseUrl);
  await page.waitForTimeout(2500);
  await step(page, 'both editors side by side', 'btn-styles-01-initial');

  // Test SVG editor (nextElementSibling after #plugin-button-styles-svg)
  const svgEditor = await page.locator('#plugin-button-styles-svg + .note-editor');
  await svgEditor.locator('.note-editable').click();
  await page.evaluate(() => {
    const editor = document.querySelector('#plugin-button-styles-svg + .note-editor .note-editable p');
    if (!editor) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await svgEditor.locator('.note-btn-markText').click();
  await page.waitForTimeout(200);
  await step(page, 'svg editor with mark', 'btn-styles-02-svg-mark');

  await svgEditor.locator('.sn-plugin-emoji-toggle').click();
  await svgEditor.locator('.sn-plugin-emoji-picker.show').waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await step(page, 'svg editor emoji dropdown open', 'btn-styles-03-svg-emoji-open');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await svgEditor.locator('.note-btn-word-counter').click();
  await page.waitForTimeout(150);
  await svgEditor.locator('.note-btn-link-extractor').click();
  await page.waitForTimeout(200);
  await step(page, 'svg editor toggles active', 'btn-styles-04-svg-toggles');

  // Test Text editor
  const textEditor = await page.locator('#plugin-button-styles-text + .note-editor');
  await textEditor.locator('.note-editable').click();
  await page.evaluate(() => {
    const editor = document.querySelector('#plugin-button-styles-text + .note-editor .note-editable p');
    if (!editor) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await textEditor.locator('.note-btn-markText').click();
  await page.waitForTimeout(200);
  await step(page, 'text editor with mark', 'btn-styles-05-text-mark');

  await textEditor.locator('.sn-plugin-emoji-toggle').click();
  await textEditor.locator('.sn-plugin-emoji-picker.show').waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await step(page, 'text editor emoji dropdown open', 'btn-styles-06-text-emoji-open');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await textEditor.locator('.note-btn-word-counter').click();
  await page.waitForTimeout(150);
  await textEditor.locator('.note-btn-link-extractor').click();
  await page.waitForTimeout(200);
  await step(page, 'text editor toggles active', 'btn-styles-07-text-toggles');

} catch (err) {
  console.error('Error:', err.message);
  await step(page, 'error-state', 'btn-styles-ERROR');
  process.exit(1);
} finally {
  await browser.close();
}