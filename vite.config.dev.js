import { defineConfig } from 'vite';

const config = defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },

  build: {

    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        entryFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        chunkFileNames: `[name].js`,
      },

    },
  },
});

export default config;
