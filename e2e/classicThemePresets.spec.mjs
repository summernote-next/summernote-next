import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const themePageUrl = `${baseUrl}/summernote-next-classic/bootswatch.html`;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readEditorVar(page, name) {
  return page.evaluate((prop) => {
    const frame = document.querySelector('.note-editor.note-frame');
    return getComputedStyle(frame).getPropertyValue(prop).trim();
  }, name);
}

async function readEditorStyle(page, name) {
  return page.evaluate((prop) => {
    const frame = document.querySelector('.note-editor.note-frame');
    return getComputedStyle(frame)[prop].trim();
  }, name);
}

async function readToolbarStyle(page, name) {
  return page.evaluate((prop) => {
    const toolbar = document.querySelector('.note-editor .note-toolbar');
    return getComputedStyle(toolbar)[prop].trim();
  }, name);
}

const expectations = {
  brite: { mode: 'light', colorScheme: 'light', primary: '#6d5efc', frameColor: 'rgb(33, 37, 41)', frameRadius: '6px' },
  darkly: { mode: 'dark', colorScheme: 'dark', primary: '#7dd3fc', frameColor: 'rgb(248, 249, 250)', frameBgContains: '15, 23, 42', toolbarBgContains: '30, 41, 59', frameRadius: '6px' },
  minty: { mode: 'light', colorScheme: 'light', primary: '#14b8a6', frameColor: 'rgb(33, 37, 41)', toolbarBgContains: '220, 252, 231', frameRadius: '6px' },
  solar: { mode: 'dark', colorScheme: 'dark', primary: '#f59e0b', frameColor: 'rgb(248, 249, 250)', frameBgContains: '17, 24, 39', frameRadius: '6px' },
  cyborg: { mode: 'dark', colorScheme: 'dark', primary: '#22d3ee', frameColor: 'rgb(248, 249, 250)', frameRadius: '6px' },
  yeti: { mode: 'light', colorScheme: 'light', primary: '#0369a1', frameColor: 'rgb(33, 37, 41)', frameRadius: '6px' },
  cosmo: { mode: 'light', colorScheme: 'light', primary: '#2563eb', frameColor: 'rgb(33, 37, 41)', frameRadius: '0px' },
  sketchy: { mode: 'light', colorScheme: 'light', primary: '#dc2626', frameColor: 'rgb(33, 37, 41)', frameRadius: '0px' },
  morph: { mode: 'light', colorScheme: 'light', primary: '#ec4899', frameColor: 'rgb(33, 37, 41)', frameRadius: '12px' },
};

const tests = Object.entries(expectations).map(([theme, expected]) => ({
  name: `classic-theme-${theme}`,
  async run(page) {
    await page.selectOption('#bootswatch-theme-select', theme);
    await page.waitForTimeout(80);

    const mode = await page.evaluate(() => document.documentElement.dataset.exampleThemeMode);
    const primary = await readEditorVar(page, '--bs-primary');
    const colorScheme = await readEditorVar(page, 'color-scheme');
    const frameColor = await readEditorStyle(page, 'color');
    const frameBg = await readEditorStyle(page, 'backgroundColor');
    const toolbarBg = await readToolbarStyle(page, 'backgroundColor');
    const frameRadius = await readEditorStyle(page, 'borderRadius');

    if (mode !== expected.mode) {
      throw new Error(`expected mode ${expected.mode}, got ${mode}`);
    }
    if (colorScheme !== expected.colorScheme) {
      throw new Error(`expected color-scheme ${expected.colorScheme}, got ${colorScheme}`);
    }
    if (primary !== expected.primary) {
      throw new Error(`expected --bs-primary ${expected.primary}, got ${primary}`);
    }
    if (frameColor !== expected.frameColor) {
      throw new Error(`expected frame color ${expected.frameColor}, got ${frameColor}`);
    }
    if (frameRadius !== expected.frameRadius) {
      throw new Error(`expected frame border-radius ${expected.frameRadius}, got ${frameRadius}`);
    }
    if (expected.frameBgContains && !frameBg.includes(expected.frameBgContains)) {
      throw new Error(`expected frame background to contain ${expected.frameBgContains}, got ${frameBg}`);
    }
    if (expected.toolbarBgContains && !toolbarBg.includes(expected.toolbarBgContains)) {
      throw new Error(`expected toolbar background to contain ${expected.toolbarBgContains}, got ${toolbarBg}`);
    }

    await page.screenshot({ path: resolve(screenshotDir, `playwright-classic-theme-${theme}-${timestamp()}.png`), fullPage: true });
    return { theme, mode, primary, colorScheme };
  },
}));

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
    await page.goto(themePageUrl, { waitUntil: 'networkidle' });
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
