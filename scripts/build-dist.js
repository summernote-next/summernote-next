import { build } from 'vite';
import { pathToFileURL } from 'url';
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { configs, styles } from '../vite.config.js';
import { writeManifest, copySvgs } from './build-icons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildVariant(config, fileBase, emptyOutDir) {
  const minifiedConfig = {
    ...config,
    build: {
      ...config.build,
      emptyOutDir,
      minify: true,
      terserOptions: undefined,
      lib: {
        ...config.build.lib,
        fileName: () => `${fileBase}.min.js`,
      },
      rollupOptions: {
        ...config.build.rollupOptions,
        output: {
          ...config.build.rollupOptions.output,
          assetFileNames: `${fileBase}.min.[ext]`,
          entryFileNames: `${fileBase}.min.js`,
        },
      },
    },
  };

  const unminifiedConfig = {
    ...config,
    build: {
      ...config.build,
      emptyOutDir: false,
      minify: false,
      terserOptions: { compress: false, mangle: false },
      lib: {
        ...config.build.lib,
        fileName: () => `${fileBase}.js`,
      },
      rollupOptions: {
        ...config.build.rollupOptions,
        output: {
          ...config.build.rollupOptions.output,
          assetFileNames: `${fileBase}.[ext]`,
          entryFileNames: `${fileBase}.js`,
        },
      },
    },
  };

  await build(minifiedConfig);
  await build(unminifiedConfig);
}

export async function buildDist() {
  let emptyOutDir = true;

  const srcRoot = resolve(__dirname, '..', 'src');
  const svgDir = resolve(srcRoot, 'icons');
  const manifestOut = resolve(srcRoot, 'js', 'icons.js');
  writeManifest(svgDir, manifestOut);

  for (const [style, config] of Object.entries(configs)) {
    await buildVariant(config, styles[style].fileBase, emptyOutDir);
    emptyOutDir = false;
  }

  const distDir = resolve(__dirname, '..', 'dist');
  if (existsSync(distDir)) {
    const destIcons = join(distDir, 'icons');
    const count = copySvgs(svgDir, destIcons);
    console.log(`Copied ${count} icon(s) to dist/icons/.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildDist();
}