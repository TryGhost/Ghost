import { defineConfig, type Plugin } from 'vite';

// pnpm keeps dependencies in a store outside the repository, so the paths the bundler
// writes into region comments and the source map lead through the machine that built it.
// From `node_modules/` on is all a reader needs.
const fromNodeModules = (path: string) => path.replace(/^.*\/node_modules\//, 'node_modules/');

const tidyRegionComments: Plugin = {
  name: 'tidy-region-comments',
  renderChunk(code) {
    return {
      code: code.replace(/^\/\/#region .*$/gm, (line) =>
        line.replace(/ .*\/node_modules\//, ' node_modules/'),
      ),
      // Only comment lines change, and no line is added or removed, so the map still holds.
      map: null,
    };
  },
};

// The browser bundle: one ES module with @quilted/threads inlined, for a page to load from a
// <script type="module"> with no bundler of its own. Left unminified, with a source map,
// so it reads well in devtools while the SDK is young.
export default defineConfig({
  plugins: [tidyRegionComments],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    minify: false,
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'app-sdk.js',
    },
    rolldownOptions: {
      // Nothing is left for the page to provide.
      external: [],
      output: {
        sourcemapPathTransform: fromNodeModules,
      },
    },
  },
});
