// Builds the editor bundles Ghost loads into its card sandboxes: one self-contained IIFE each,
// as Ghost evaluates the source it fetches, with no module loading. Run once per bundle:
// `vite build -c vite.editor.config.ts --mode render` and `--mode settings`.
import { resolve } from 'node:path';

import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  if (mode !== 'render' && mode !== 'settings') {
    throw new Error('Build the editor bundles with --mode render or --mode settings');
  }
  return {
    publicDir: false,
    resolve: { conditions: ['source', ...defaultClientConditions] },
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: resolve(import.meta.dirname, 'public/editor'),
      emptyOutDir: false,
      minify: true,
      sourcemap: false,
      lib: {
        entry: resolve(import.meta.dirname, `src/${mode}.ts`),
        name: `ghostDemoCards_${mode}`,
        formats: ['iife'],
        fileName: () => `${mode}.js`,
      },
    },
  };
});
