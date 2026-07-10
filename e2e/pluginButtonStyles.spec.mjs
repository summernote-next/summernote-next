import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const buttonStylesUrl = `${baseUrl}/summernote-next/plugin-button-styles.html`;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const tests = [
  {
    name: 'plugin-button-styles-renders-three-editors',
    async run(page) {
      await page.goto(buttonStylesUrl, { waitUntil: 'networkidle' });
      await page.waitForSelector('.note-editor', { timeout: 10000 });

      const counts = await page.evaluate(() => ({
        svgEditors: document.querySelectorAll('.sn-plugin-button-svg-mode').length,
        textEditors: document.querySelectorAll('.sn-plugin-button-text-mode').length,
        glyphEditors: document.querySelectorAll('.sn-plugin-button-glyph-mode').length,
        editors: document.querySelectorAll('.note-editor').length,
      }));

      if (counts.editors !== 3) {
        throw new Error(`expected 3 editors, got ${counts.editors}`);
      }
      if (counts.svgEditors < 5) {
        throw new Error(`expected svg-mode buttons in svg editor, got ${counts.svgEditors}`);
      }
      if (counts.textEditors < 5) {
        throw new Error(`expected text-mode buttons in text editor, got ${counts.textEditors}`);
      }
      if (counts.glyphEditors < 2) {
        throw new Error(`expected glyph-mode buttons in glyph editor (at least emoji + special chars), got ${counts.glyphEditors}`);
      }

      await page.screenshot({
        path: resolve(screenshotDir, `playwright-plugin-button-styles-${timestamp()}.png`),
        fullPage: true,
      });
      return counts;
    },
  },
  {
    name: 'plugin-button-styles-glyph-emoji-shows-unicode',
    async run(page) {
      await page.goto(buttonStylesUrl, { waitUntil: 'networkidle' });
      await page.waitForSelector('.note-editor', { timeout: 10000 });

      const glyphEditor = page.locator('#plugin-button-styles-glyph + .note-editor');
      const emojiToggle = glyphEditor.locator('.sn-plugin-emoji-toggle');
      const emojiText = await emojiToggle.textContent();

      if (!emojiText || !emojiText.includes('😀')) {
        throw new Error(`expected emoji glyph to be 😀, got "${emojiText}"`);
      }

      await emojiToggle.click();
      await glyphEditor.locator('.sn-plugin-emoji-picker.show').waitFor({ timeout: 5000 });
      const cellCount = await glyphEditor.locator('.sn-plugin-emoji-cell').count();
      if (cellCount < 5) {
        throw new Error(`expected emoji cells, got ${cellCount}`);
      }
      return { glyph: emojiText.trim(), cellCount };
    },
  },
  {
    name: 'plugin-button-styles-glyph-special-chars-shows-omega',
    async run(page) {
      await page.goto(buttonStylesUrl, { waitUntil: 'networkidle' });
      await page.waitForSelector('.note-editor', { timeout: 10000 });

      const glyphEditor = page.locator('#plugin-button-styles-glyph + .note-editor');
      const toggle = glyphEditor.locator('.sn-plugin-special-chars-toggle');
      const text = await toggle.textContent();

      if (!text || !text.includes('Ω')) {
        throw new Error(`expected special chars glyph to be Ω, got "${text}"`);
      }

      await toggle.click();
      await glyphEditor.locator('.sn-plugin-special-chars.show').waitFor({ timeout: 5000 });
      const cellCount = await glyphEditor.locator('.sn-plugin-special-chars-cell').count();
      if (cellCount < 5) {
        throw new Error(`expected special char cells, got ${cellCount}`);
      }
      return { glyph: text.trim(), cellCount };
    },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });

let pass = 0;
let fail = 0;
const failures = [];

for (const test of tests) {
  const page = await context.newPage();
  try {
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