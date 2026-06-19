import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
  define: {
    __SUMMERNOTE_NEXT_VERSION__: JSON.stringify(pkg.version),
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['test/scripts/**/*.spec.js'],
    exclude: ['node_modules/**'],
  },
});
