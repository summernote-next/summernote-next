import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', '..', 'src', 'font', 'icons');

function readManifest() {
  const raw = readFileSync(join(iconsDir, 'index.js'), 'utf8');
  const match = raw.match(/export\s+default\s*\[([\s\S]*)\]/);
  if (!match) {
    throw new Error('could not parse icon manifest');
  }
  return match[1]
    .split(/[\n,]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/^['"]|['"]$/g, ''));
}

describe('icon manifest', () => {
  it('lists exactly the svg files found in src/font/icons', () => {
    const files = readdirSync(iconsDir)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/, ''))
      .sort();
    const manifest = readManifest().sort();

    expect(manifest, 'run `npm run build` to regenerate src/font/icons/index.js').to.deep.equal(files);
  });

  it('does not contain duplicate entries', () => {
    const manifest = readManifest();
    expect(new Set(manifest).size).to.equal(manifest.length);
  });
});
