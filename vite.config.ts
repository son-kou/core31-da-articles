import { defineConfig } from 'vite';

// base './' + hash routing: the same build works at https://USER.github.io/REPO/ (any repo name), locally and from a sub-folder.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { port: 5173 },
});
