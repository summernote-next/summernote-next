import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildExamplesPackage } from '../../scripts/build-examples-package.js';

let outputDir;

beforeEach(() => {
  outputDir = mkdtempSync(join(tmpdir(), 'sn-examples-pkg-'));
});

afterEach(() => {
  rmSync(outputDir, { recursive: true, force: true });
});

describe('buildExamplesPackage', () => {
  it('copies the real dist content into the former mount points', () => {
    const { zipPath } = buildExamplesPackage({ outputDir, zipName: 'test-examples.zip' });

    expect(existsSync(zipPath)).to.be.true;

    const zip = new AdmZip(zipPath);
    const entries = new Set(zip.getEntries().map(entry => entry.entryName));

    expect(entries.has('examples/index.html')).to.be.true;
    expect(entries.has('examples/summernote-next/default.html')).to.be.true;
    expect(entries.has('examples/summernote-next-classic/default.html')).to.be.true;

    expect(entries.has('examples/dist/summernote-next.js')).to.be.true;
    expect(entries.has('examples/dist/summernote-next.css')).to.be.true;
    expect(entries.has('examples/dist/summernote-next-classic.js')).to.be.true;
    expect(entries.has('examples/dist/lang/de-de.js')).to.be.true;
    expect(entries.has('examples/assets/examples.css')).to.be.true;

    expect(entries.has('examples/font/summernote.woff2')).to.be.false;
    expect(entries.has('examples/font/summernote.woff')).to.be.false;
    expect(entries.has('examples/font/summernote.ttf')).to.be.false;
    expect(entries.has('examples/font/summernote.eot')).to.be.false;
  });

  it('does not package any zip artifacts from the dist directory', () => {
    const { zipPath } = buildExamplesPackage({ outputDir, zipName: 'test-examples.zip' });

    const zip = new AdmZip(zipPath);
    const entryNames = zip.getEntries().map(entry => entry.entryName);

    const zipEntries = entryNames.filter(name => name.endsWith('.zip'));
    expect(zipEntries, `package should not contain zip artifacts but found: ${zipEntries.join(', ')}`).to.have.length(0);
  });

  it('produces a self-contained package where every example asset reference resolves', () => {
    const { zipPath } = buildExamplesPackage({ outputDir, zipName: 'test-examples.zip' });

    const zip = new AdmZip(zipPath);
    const entries = new Set(zip.getEntries().map(entry => entry.entryName));

    const defaultHtml = zip.getEntry('examples/summernote-next/default.html').getData().toString('utf8');
    const references = [...defaultHtml.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map(match => match[1]);

    references
      .filter(reference => !reference.startsWith('http'))
      .forEach(reference => {
        const entry = `examples${reference}`;
        expect(entries.has(entry), `package should resolve referenced asset ${reference} (${entry})`).to.be.true;
      });
  });

  it('does not reference any font files from the compiled stylesheet', () => {
    const { zipPath } = buildExamplesPackage({ outputDir, zipName: 'test-examples.zip' });

    const zip = new AdmZip(zipPath);
    const css = zip.getEntry('examples/dist/summernote-next.css').getData().toString('utf8');

    expect(css).not.to.match(/url\(["']?\.\.\/font\//);
    expect(css).not.to.contain('@font-face');
  });
});
