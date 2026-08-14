/* eslint-env node */
/**
 * Second build target: the lazy-loaded edit-mode chunk.
 *
 * Builds src/edit-mode/index.js to umd/admin-toolbar-editor.min.js as a plain
 * ES module, next to the main IIFE bundle. The main bundle never imports the
 * chunk statically — src/edit-mode/loader.js resolves it relative to the
 * toolbar script's own URL and loads it with a native dynamic import(), so it
 * stays out of the IIFE (which rollup would otherwise inline via
 * inlineDynamicImports).
 *
 * Run via `pnpm build` (after the main build — the main build's one-off,
 * non-watch mode empties umd/) or `pnpm build:editor` on its own. `pnpm dev`
 * runs this watcher concurrently with the main and worker watchers.
 */
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: '@tryghost/admin-toolbar-editor',
    entry: 'src/edit-mode/index.js',
    framework: 'preact',
    svgr: false,
    libFormat: 'es',
    sourcemap: false,
    overrides: {
        build: {
            // The main build owns cleaning umd/; wiping it here would delete
            // the freshly built admin-toolbar.min.js.
            emptyOutDir: false
        }
    }
});
