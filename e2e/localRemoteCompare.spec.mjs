import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const localUrl = process.env.SUMMERNOTE_E2E_URL || 'http://localhost';
const remoteUrl = process.env.SUMMERNOTE_E2E_REMOTE_URL || 'https://juergen-schwind.com/summernote-next';

const variants = [
  { name: 'bs5', local: `${localUrl}/summernote-next/default.html`, remote: `${remoteUrl}/summernote-next/default.html` },
  { name: 'classic', local: `${localUrl}/summernote-next-classic/default.html`, remote: `${remoteUrl}/summernote-next-classic/default.html` },
];

function pixelDiff(a, b) {
  if (a.width !== b.width || a.height !== b.height) {
    return { sameSize: false, aSize: { w: a.width, h: a.height }, bSize: { w: b.width, h: b.height } };
  }
  let total = 0;
  let maxChannelDiff = 0;
  let differingPixels = 0;
  const pixelCount = a.width * a.height;
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const db = Math.abs(a.data[i + 2] - b.data[i + 2]);
    const sum = dr + dg + db;
    total += sum;
    if (sum > 0) {
      differingPixels += 1;
      if (sum > maxChannelDiff) maxChannelDiff = sum;
    }
  }
  return {
    sameSize: true,
    avgPerPixel: total / pixelCount,
    differingPixels,
    differingRatio: differingPixels / pixelCount,
    maxChannelDiff,
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
let pass = 0;
let fail = 0;
const failures = [];

for (const variant of variants) {
  const localPath = resolve(screenshotDir, `compare-${variant.name}-local-${stamp}.png`);
  const remotePath = resolve(screenshotDir, `compare-${variant.name}-remote-${stamp}.png`);

  const localPage = await context.newPage();
  await localPage.goto(variant.local, { waitUntil: 'networkidle' });
  await localPage.waitForSelector('.note-toolbar .note-icon-bold', { timeout: 5000 });
  await localPage.screenshot({ path: localPath, fullPage: true });
  await localPage.close();

  const remotePage = await context.newPage();
  await remotePage.goto(variant.remote, { waitUntil: 'networkidle' });
  await remotePage.waitForSelector('.note-toolbar .note-icon-bold', { timeout: 5000 });
  await remotePage.screenshot({ path: remotePath, fullPage: true });
  await remotePage.close();

  const localPng = PNG.sync.read(readFileSync(localPath));
  const remotePng = PNG.sync.read(readFileSync(remotePath));
  const diff = pixelDiff(localPng, remotePng);

  if (!diff.sameSize) {
    console.error(`FAIL  ${variant.name} compare: differing sizes`, diff);
    fail += 1;
    failures.push({ name: `${variant.name} compare`, error: 'differing sizes' });
    continue;
  }

  console.log(`INFO  ${variant.name} compare`, diff);

  if (diff.avgPerPixel <= 12 && diff.differingRatio <= 0.20) {
    console.log(`PASS  ${variant.name} compare (avgPerPixel=${diff.avgPerPixel.toFixed(3)}, differingRatio=${(diff.differingRatio * 100).toFixed(2)}%)`);
    pass += 1;
  } else {
    console.error(`FAIL  ${variant.name} compare: pixel drift too large`);
    fail += 1;
    failures.push({ name: `${variant.name} compare`, error: `pixel drift ${diff.avgPerPixel}, ratio ${diff.differingRatio}` });
  }
}

await browser.close();

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
