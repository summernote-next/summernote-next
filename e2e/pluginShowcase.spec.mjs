import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const showcaseUrl = `${baseUrl}/summernote-next/plugins-showcase.html`;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const tests = [
  {
    name: 'plugin-showcase-toolbar-buttons',
    async run(page) {
      await page.waitForSelector('.note-btn-word-counter', { timeout: 5000 });
      const counts = await page.evaluate(() => ({
        wordCounter: !!document.querySelector('.note-btn-word-counter'),
        linkExtractor: !!document.querySelector('.note-btn-link-extractor'),
        align: document.querySelectorAll('.sn-plugin-align').length,
        textStyles: document.querySelectorAll('.sn-plugin-text-styles').length,
        specialChars: !!document.querySelector('.sn-plugin-special-chars'),
        emoji: !!document.querySelector('.sn-plugin-emoji-toggle'),
        wordBadge: !!document.querySelector('[data-sn-word-counter]'),
        linkPanel: !!document.querySelector('[data-sn-link-extractor]'),
        registeredPlugins: window.summernote?.listPlugins?.() || [],
      }));

      if (!counts.wordCounter || !counts.linkExtractor) throw new Error('plugin toolbar buttons missing');
      if (counts.align !== 4) throw new Error(`expected 4 alignment buttons, got ${counts.align}`);
      if (counts.textStyles !== 5) throw new Error(`expected 5 text style buttons, got ${counts.textStyles}`);
      if (!counts.specialChars) throw new Error('special chars dropdown missing');
      if (!counts.emoji) throw new Error('emoji picker dropdown missing');
      if (!counts.wordBadge) throw new Error('word counter badge missing');
      if (!counts.linkPanel) throw new Error('link extractor panel missing');

      const expectedPlugins = ['wordCounter', 'alignmentButtons', 'specialCharacters', 'textStyles', 'linkExtractor', 'emojiPicker'];
      for (const name of expectedPlugins) {
        if (!counts.registeredPlugins.includes(name)) {
          throw new Error(`expected plugin "${name}" to be registered`);
        }
      }

      await page.screenshot({ path: resolve(screenshotDir, `playwright-plugin-toolbar-${timestamp()}.png`), fullPage: true });
      return counts;
    },
  },
  {
    name: 'plugin-showcase-word-counter-updates',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const p = document.querySelector('.note-editable p');
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      const initial = await page.locator('[data-sn-word-counter]').getAttribute('data-sn-words');
      await page.keyboard.type(' some additional content');

      const after = await page.locator('[data-sn-word-counter]').getAttribute('data-sn-words');
      if (initial === after) {
        throw new Error(`expected word count to change, was still ${initial}`);
      }

      const stats = await page.evaluate(() => window.summernote.invoke('#plugin-showcase-editor', 'wordCounter.stats'));
      if (typeof stats.words !== 'number' || stats.words < 1) {
        throw new Error(`invalid word stats: ${JSON.stringify(stats)}`);
      }

      return { initial, after, stats };
    },
  },
  {
    name: 'plugin-showcase-align-center',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const p = document.querySelector('.note-editable p');
        const range = document.createRange();
        range.selectNodeContents(p);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await page.click('.note-btn-align-center');
      const style = await page.locator('.note-editable p').first().getAttribute('style');
      if (!style || !style.toLowerCase().includes('center')) {
        throw new Error(`expected center alignment in style, got "${style}"`);
      }

      await page.screenshot({ path: resolve(screenshotDir, `playwright-plugin-align-center-${timestamp()}.png`), fullPage: true });
      return { style };
    },
  },
  {
    name: 'plugin-showcase-mark-text-style',
    async run(page) {
      await page.click('.note-editable');
      const selected = await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        editable.focus();
        const p = editable.querySelector('p');
        const textNode = p.firstChild;
        const range = document.createRange();
        const len = Math.min(textNode.textContent.length, 5);
        range.setStart(textNode, 0);
        range.setEnd(textNode, len);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        window.summernote.invoke('#plugin-showcase-editor', 'editor.setLastRange', window.summernote.getInstance('#plugin-showcase-editor').modules.editor.createRange());
        return sel.toString();
      });

      if (!selected) {
        throw new Error(`failed to select text, got "${selected}"`);
      }

      await page.click('.note-btn-markText');
      const markCount = await page.locator('.note-editable mark').count();
      if (markCount < 1) {
        const html = await page.locator('.note-editable').innerHTML();
        throw new Error(`expected at least one <mark> element after applying the mark style, got html: ${html}`);
      }
      return { markCount, selected };
    },
  },
  {
    name: 'plugin-showcase-link-extractor',
    async run(page) {
      const links = await page.evaluate(() => window.summernote.invoke('#plugin-showcase-editor', 'linkExtractor.list'));
      if (!Array.isArray(links) || links.length < 1) {
        throw new Error(`expected at least one extracted link, got ${JSON.stringify(links)}`);
      }
      const panelItems = await page.locator('[data-sn-link-extractor] .sn-plugin-link-extractor-item').count();
      if (panelItems !== links.length) {
        throw new Error(`expected ${links.length} panel items, got ${panelItems}`);
      }
      await page.screenshot({ path: resolve(screenshotDir, `playwright-plugin-link-extractor-${timestamp()}.png`), fullPage: true });
      return { extractedCount: links.length, panelItems };
    },
  },
  {
    name: 'plugin-showcase-special-characters',
    async run(page) {
      await page.click('.sn-plugin-special-chars-toggle');
      await page.waitForSelector('.sn-plugin-special-chars.show', { timeout: 5000 });
      const cellCount = await page.locator('.sn-plugin-special-chars-cell').count();
      if (cellCount < 5) {
        throw new Error(`expected many character cells, got ${cellCount}`);
      }
      await page.click('.sn-plugin-special-chars-cell:first-child');
      const editableText = await page.locator('.note-editable').textContent();
      if (!editableText || editableText.trim().length === 0) {
        throw new Error('expected editor content after inserting a character');
      }
      return { cellCount };
    },
  },
  {
    name: 'plugin-showcase-emoji-picker-keeps-toolbar-enabled',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        const range = document.createRange();
        range.selectNodeContents(editable);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        window.summernote.invoke('#plugin-showcase-editor', 'editor.setLastRange',
          window.summernote.getInstance('#plugin-showcase-editor').modules.editor.createRange());
      });

      await page.click('.sn-plugin-emoji-toggle');
      await page.waitForSelector('.sn-plugin-emoji-picker.show', { timeout: 5000 });
      await page.click('.sn-plugin-emoji-cell:first-child');
      await page.waitForTimeout(150);

      const editableText = await page.locator('.note-editable').textContent();
      if (!editableText || !editableText.includes('😀')) {
        throw new Error(`expected emoji to be inserted, got: ${editableText?.slice(0, 200)}`);
      }

      const disabledCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.note-toolbar button'))
          .filter((b) => b.hasAttribute('disabled') || b.classList.contains('disabled')).length;
      });
      const totalButtons = await page.locator('.note-toolbar button').count();
      if (disabledCount !== 0) {
        throw new Error(`BUG REGRESSION: toolbar deactivated after emoji insert (${disabledCount}/${totalButtons} buttons disabled)`);
      }

      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        editable.focus();
        const range = document.createRange();
        const textNode = editable.querySelector('p').firstChild;
        if (textNode && textNode.nodeType === 3) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, textNode.length);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          window.summernote.invoke('#plugin-showcase-editor', 'editor.setLastRange',
            window.summernote.getInstance('#plugin-showcase-editor').modules.editor.createRange());
        }
      });
      await page.click('.note-btn-bold');
      await page.waitForTimeout(150);
      const html = await page.locator('.note-editable').innerHTML();
      if (!html.includes('<strong>') && !html.includes('<b>')) {
        throw new Error(`expected bold formatting after clicking bold button, got: ${html.slice(0, 200)}`);
      }

      await page.screenshot({ path: resolve(screenshotDir, `playwright-plugin-emoji-toolbar-${timestamp()}.png`), fullPage: true });
      return { disabledCount, totalButtons };
    },
  },
  {
    name: 'plugin-showcase-special-chars-keeps-toolbar-enabled',
    async run(page) {
      await page.click('.note-editable');
      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        const range = document.createRange();
        range.selectNodeContents(editable);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        window.summernote.invoke('#plugin-showcase-editor', 'editor.setLastRange',
          window.summernote.getInstance('#plugin-showcase-editor').modules.editor.createRange());
      });

      await page.click('.sn-plugin-special-chars-toggle');
      await page.waitForSelector('.sn-plugin-special-chars.show', { timeout: 5000 });
      await page.click('.sn-plugin-special-chars-cell:first-child');
      await page.waitForTimeout(150);

      const disabledCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.note-toolbar button'))
          .filter((b) => b.hasAttribute('disabled') || b.classList.contains('disabled')).length;
      });
      const totalButtons = await page.locator('.note-toolbar button').count();
      if (disabledCount !== 0) {
        throw new Error(`BUG REGRESSION: toolbar deactivated after special char insert (${disabledCount}/${totalButtons} buttons disabled)`);
      }

      await page.evaluate(() => {
        const editable = document.querySelector('.note-editable');
        editable.focus();
        const range = document.createRange();
        const textNode = editable.querySelector('p').firstChild;
        if (textNode && textNode.nodeType === 3) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, textNode.length);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          window.summernote.invoke('#plugin-showcase-editor', 'editor.setLastRange',
            window.summernote.getInstance('#plugin-showcase-editor').modules.editor.createRange());
        }
      });
      await page.click('.note-btn-bold');
      await page.waitForTimeout(150);
      const html = await page.locator('.note-editable').innerHTML();
      if (!html.includes('<strong>') && !html.includes('<b>')) {
        throw new Error(`expected bold formatting after clicking bold button, got: ${html.slice(0, 200)}`);
      }

      return { disabledCount, totalButtons };
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
    await page.goto(showcaseUrl, { waitUntil: 'networkidle' });
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