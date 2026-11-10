import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { dts } from 'rolldown-plugin-dts';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

import { sdkVersion } from './version.config.ts';

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

// Writes the package's type declarations next to its code, a file for each entry point, with the
// contract types the SDK uses inlined, so an app needs nothing from @tryghost/app-contracts. Only
// the types each entry point exports are exported. TypeScript 7 emits the declarations. The
// plugin looks for it as `typescript`, which is the TypeScript 6 shim here, so it is pointed at
// `@typescript/native`.
async function bundleDeclarations(): Promise<Plugin[]> {
  const typescript = createRequire(import.meta.url).resolve('@typescript/native/package.json');
  const { default: getExePath } = (await import(
    pathToFileURL(join(dirname(typescript), 'lib/getExePath.js')).href
  )) as { default: () => string };
  return [
    // Typed as Rolldown plugins, whose `resolveId` options Vite's own type for them narrows.
    ...(dts({
      generator: 'tsgo',
      tsgo: { path: getExePath() },
      cwd: import.meta.dirname,
      tsconfig: 'tsconfig.json',
      // A declaration map would point into src/, which the package doesn't publish.
      sourcemap: false,
    }) as Plugin[]),
    {
      // The contracts' root declarations import zod for their manifest types, which the SDK
      // doesn't use. Leaving zod out spares loading its declarations, which are CommonJS and
      // can't be bundled; with no side effects, the import goes when nothing uses it, and the
      // bundle tests fail if something does.
      name: 'leave-out-zod-declarations',
      // Before Vite resolves the import to zod's own files.
      enforce: 'pre',
      resolveId(source, importer) {
        if (importer?.endsWith('.d.ts') && /^zod(?:\/|$)/.test(source)) {
          return { id: source, external: true, moduleSideEffects: false };
        }
      },
    },
    {
      // The plugin drops the declaration map, but the build's `sourcemap` still adds the
      // comment that points to it.
      name: 'drop-declaration-map-comment',
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.fileName.endsWith('.d.ts')) {
            chunk.code = chunk.code.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n');
          }
        }
      },
    },
  ];
}

const shared = {
  target: 'es2022',
  // Left unminified, with a source map, so it reads well in devtools.
  minify: false,
  sourcemap: true,
  emptyOutDir: true,
} as const;

// The build a bundler or Node imports, in `build/`, built with `--mode package`: an ES module
// for each entry point, sharing chunks, with the parts of @tryghost/app-contracts the SDK uses
// inlined, so the package depends only on what it lists in `dependencies`. A function, so only
// this build sets up the declaration plugin.
const packageBuild = (): UserConfig => ({
  define: sdkVersion,
  plugins: [tidyRegionComments, bundleDeclarations()],
  // Vite would compile the generated declarations to JavaScript, which drops every type. This
  // replaces Vite's own exclusions, so JavaScript stays excluded too.
  oxc: { exclude: [/\.js$/, /\.d\.[cm]?ts$/] },
  build: {
    ...shared,
    outDir: 'build',
    // Named after the entry, as the declarations are the same entry named `index.d`, and the
    // declaration plugin turns `index.d.js` into `index.d.ts`.
    lib: {
      entry: {
        // The page's SDK.
        index: 'src/index.ts',
        // An app's backend, on any platform.
        backend: 'src/backend/index.ts',
        // An app's tooling, in Node.
        tooling: 'src/tooling/index.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      // Node builtins stay imports, for the entry points that run in Node. The bundle tests fail
      // if the page or the backend reaches one, and lint requires the `node:` prefix, as Vite
      // stubs a builtin imported without it.
      external: [/^node:/, /^(?:@quilted\/threads|jose|zod)(?:\/|$)/],
      output: {
        sourcemapPathTransform: fromNodeModules,
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
      // Declarations and the contracts have no side effects, so an entry point never imports a
      // chunk, or a package, only because another entry point uses it.
      treeshake: {
        moduleSideEffects: (id) => !/\.d\.[cm]?ts$/.test(id) && !/\/app-contracts\//.test(id),
      },
      // Generating the declarations runs TypeScript, which is expected to be slow.
      checks: { pluginTimings: false },
    },
  },
});

// The browser bundle, in `dist/`, built by default: one ES module with @quilted/threads
// inlined too, for a page to load from a <script type="module"> with no bundler of its own.
// Admin's acceptance specs build it from this config to run the SDK in a frame.
const browserBundle: UserConfig = {
  define: sdkVersion,
  plugins: [tidyRegionComments],
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

export default defineConfig(({ mode }) => (mode === 'package' ? packageBuild() : browserBundle));
