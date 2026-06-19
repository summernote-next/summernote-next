import { version } from '../vite.config.js';
import AdmZip from 'adm-zip';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

export function buildExamplesPackage({ outputDir, zipName } = {}) {
  const root = process.cwd();
  const examplesSource = join(root, 'examples');
  const distSource = join(root, 'dist');
  const fontSource = join(root, 'font');
  const stagingDir = join(root, '.tmp', 'examples-package');
  const stagingExamples = join(stagingDir, 'examples');

  function ensureArtifact(path, label) {
    if (!existsSync(path)) {
      throw new Error(`Missing ${label}: ${path}. Run "npm run buildall" first.`);
    }
  }

  ensureArtifact(examplesSource, 'examples directory');
  ensureArtifact(distSource, 'dist directory');
  ensureArtifact(fontSource, 'font directory');

  console.log('Assembling runnable examples package ...');

  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  console.log('Copying examples ...');
  cpSync(examplesSource, stagingExamples, { recursive: true });

  console.log('Copying dist into examples/dist (was a mount point) ...');
  rmSync(join(stagingExamples, 'dist'), { recursive: true, force: true });
  cpSync(distSource, join(stagingExamples, 'dist'), {
    recursive: true,
    filter: (src) => !src.endsWith('.zip'),
  });

  console.log('Copying font into examples/font (was a mount point) ...');
  rmSync(join(stagingExamples, 'font'), { recursive: true, force: true });
  cpSync(fontSource, join(stagingExamples, 'font'), { recursive: true });

  const targetDir = outputDir || join(root, 'dist');
  const targetZipName = zipName || `summernote-next-${version}-examples.zip`;
  mkdirSync(targetDir, { recursive: true });

  const zip = new AdmZip();
  console.log(`Compressing examples into ${targetZipName} ...`);
  zip.addLocalFolder(stagingExamples, 'examples');
  const zipPath = join(targetDir, targetZipName);
  zip.writeZip(zipPath);
  console.log('Done. Point your web server document root at the unzipped "examples" folder.');

  return { zipPath };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    buildExamplesPackage();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
