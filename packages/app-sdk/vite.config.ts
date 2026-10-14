import { join } from 'node:path';

import { generateDtsBundle } from 'dts-bundle-generator';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

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
// a builtin fails the build instead: one named as `node:…`, or one Vite stubbed, which is
// how a builtin named without the prefix shows. How Vite names its stub is its own affair, so
// the prefix is checked first.
const refuseNodeBuiltins: Plugin = {
  name: 'refuse-node-builtins',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (source.startsWith('node:')) {
      this.error(`${importer} imports ${source}, a Node builtin no page can load`);
    }
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    if (resolved?.id.startsWith('__vite-browser-external')) {
      this.error(`${importer} imports ${source}, a Node builtin no page can load`);
    }
    return resolved;
  },
};

// The package's type declarations, in one file beside its code, with the contract types the
// SDK uses written into it, so an app needs nothing from @tryghost/app-contracts. Only the
// types the entry point exports are exported.
function bundleDeclarations(): Plugin {
  let root = '';
  return {
    name: 'bundle-declarations',
    configResolved(config) {
      root = config.root;
    },
    generateBundle() {
      const [declarations] = generateDtsBundle(
        [
          {
            filePath: join(root, 'src/index.ts'),
            libraries: { inlinedLibraries: ['@tryghost/app-contracts'] },
            output: { noBanner: true, exportReferencedTypes: false },
          },
        ],
        { preferredConfigPath: join(root, 'tsconfig.json') },
      );
      this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: declarations });
    },
  };
}

const shared = {
  target: 'es2022',
  // Left unminified, with a source map, so it reads well in devtools.
  minify: false,
  sourcemap: true,
  emptyOutDir: true,
} as const;

// What a bundler imports, in `build/`, built with `--mode package`: one ES module with what
// the SDK uses from @tryghost/app-contracts inlined, so the package depends on @quilted/threads
// alone.
const packageBuild: UserConfig = {
  plugins: [refuseNodeBuiltins, tidyRegionComments, bundleDeclarations()],
  build: {
    ...shared,
    outDir: 'build',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: {
      external: [/^@quilted\/threads(?:\/|$)/],
      output: { sourcemapPathTransform: fromNodeModules },
      // Writing the declarations takes a TypeScript program, which is slow by design.
      checks: { pluginTimings: false },
    },
  },
};

// The browser bundle, in `dist/`, built by default: one ES module with @quilted/threads
// inlined too, for a page to load from a <script type="module"> with no bundler of its own.
// Admin's acceptance specs build it from this config to run the SDK in a frame.
const browserBundle: UserConfig = {
  plugins: [refuseNodeBuiltins, tidyRegionComments],
  build: {
    ...shared,
    outDir: 'dist',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'app-sdk.js' },
    rolldownOptions: {
      // Nothing is left for the page to provide.
      external: [],
      output: { sourcemapPathTransform: fromNodeModules },
    },
  },
};

export default defineConfig(({ mode }) => (mode === 'package' ? packageBuild : browserBundle));
