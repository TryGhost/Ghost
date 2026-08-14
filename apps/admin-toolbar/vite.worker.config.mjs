/* eslint-env node */
/**
 * Third build target: the edit-mode RENDER WORKER entry.
 *
 * Builds src/edit-mode/worker.js to umd/admin-toolbar-editor-worker.min.js as
 * a plain ES module beside the main IIFE bundle and the edit-mode chunk. The
 * chunk boots it as a module Web Worker via a blob bootstrap (see
 * src/edit-mode/render-client.js) — the artifact is served cross-origin from
 * the CDN, and `new Worker(url)` is same-origin-only, so the chunk creates a
 * same-origin blob module whose body just `import`s this artifact's URL.
 *
 * Run via `pnpm build` (after the main build — the main build empties umd/)
 * or `pnpm build:worker` / `pnpm dev:worker` on its own.
 */
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: '@tryghost/admin-toolbar-editor-worker',
    entry: 'src/edit-mode/worker.js',
    framework: 'preact',
    svgr: false,
    libFormat: 'es',
    sourcemap: false,
    overrides: {
        build: {
            // The main build owns cleaning umd/; wiping it here would delete
            // the freshly built bundles.
            emptyOutDir: false
        }
    }
});
