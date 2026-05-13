import { build } from 'vite';
import { pathToFileURL } from 'url';
import { configs, styles } from '../vite.config.js';

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

  for (const [style, config] of Object.entries(configs)) {
    await buildVariant(config, styles[style].fileBase, emptyOutDir);
    emptyOutDir = false;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildDist();
}
