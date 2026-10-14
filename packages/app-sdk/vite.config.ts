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

// Vite turns a Node builtin, such as `node:crypto`, into an empty stub for the browser and
// only warns about it, so a bundle that needs one would build, import nothing, and break the
// page that called it. Anything the SDK or the contracts' root reaches must run in a page, so
// a builtin fails the build instead.
const refuseNodeBuiltins: Plugin = {
  name: 'refuse-node-builtins',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    if (resolved?.id.startsWith('__vite-browser-external')) {
      this.error(`${importer} imports ${source}, a Node builtin no page can load`);
    }
    return resolved;
  },
};

// The browser bundle: one ES module with @quilted/threads inlined, for a page to load from a
// <script type="module"> with no bundler of its own. Left unminified, with a source map,
// so it reads well in devtools while the SDK is young.
export default defineConfig({
  plugins: [refuseNodeBuiltins, tidyRegionComments],
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
