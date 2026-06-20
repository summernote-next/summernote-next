import { version } from '../vite.config.js';
import AdmZip from 'adm-zip';
import { buildDist } from './build-dist.js';
import { buildLanguageAssets } from './build-language-assets.js';

await buildDist();

await buildLanguageAssets();

// compress them all into a zip file for releasing
try {
  const zip = new AdmZip();
  const zipFilename = `summernote-next-${version}-dist.zip`;
  console.log(`Compressing dist files into ${zipFilename} ...`);
  zip.addLocalFolder('./dist');
  zip.writeZip(`dist/${zipFilename}`);
} catch (error) {
  console.error(`Failed to create zip file: ${error.message}`);
  process.exit(1);
}
