import { join } from 'node:path';

import { generateDtsBundle } from 'dts-bundle-generator';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

// pnpm keeps dependencies in a store outside the repository, so the paths the bundler
// writes into region comments and the source map include local paths on the build machine.
// A reader only needs the part from `node_modules/` on.
const fromNodeModules = (path: string) => path.replace(/^.*\/node_modules\//, 'node_modules/');

const tidyRegionComments: Plugin = {
  name: 'tidy-region-comments',
  renderChunk(code) {
    return {
      code: code.replace(/^\/\/#region .*$/gm, (line) =>
        line.replace(/ .*\/node_modules\//, ' node_modules/'),
      ),
      // Only comment lines change, and no line is added or removed, so the map stays valid.
      map: null,
    };
  },
};

// Vite replaces a Node builtin, such as `node:crypto`, with an empty stub for the browser and
// only logs a warning. A bundle that needs one would build, import nothing, and break the page
// that called it. Everything the SDK or the contracts' root entry point imports must run in a
// page, so a builtin fails the build instead. That covers a builtin imported as `node:…`, and
// one Vite stubbed, which is how a builtin imported without the prefix shows up. How Vite
// names its stub is an internal detail, so the prefix is checked first.
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

// Writes the package's type declarations to one file next to its code, with the contract types
// the SDK uses inlined, so an app needs nothing from @tryghost/app-contracts. Only the types the
// entry point exports are exported.
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

// The build a bundler imports, in `build/`, built with `--mode package`: one ES module with
// the parts of @tryghost/app-contracts the SDK uses inlined, so the package depends only on
// @quilted/threads.
const packageBuild: UserConfig = {
  plugins: [refuseNodeBuiltins, tidyRegionComments, bundleDeclarations()],
  build: {
    ...shared,
    outDir: 'build',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: {
      external: [/^@quilted\/threads(?:\/|$)/],
      output: { sourcemapPathTransform: fromNodeModules },
      // Generating the declarations builds a TypeScript program, which is expected to be slow.
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
      // Bundle every dependency, so the page doesn't have to provide any.
      external: [],
      output: { sourcemapPathTransform: fromNodeModules },
    },
  },
};

export default defineConfig(({ mode }) => (mode === 'package' ? packageBuild : browserBundle));
