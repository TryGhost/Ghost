/* eslint-env node */
import { publicAppViteConfig } from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
  packageRoot: import.meta.dirname,
  packageName: '@tryghost/admin-toolbar',
  entry: 'src/index.js',
  framework: 'preact',
  svgr: false,
  libFormat: 'iife',
  libName: 'GhostAdminToolbar',
  sourcemap: false,
    overrides: {
        build: {
            // Cleaning umd/ belongs to one-off `pnpm build` runs only (the
            // editor + worker builds re-create their artifacts right after).
            // The dev watchers all run concurrently on the same outDir — a
            // watcher that empties it would delete the other two artifacts.
            emptyOutDir: !process.argv.includes('--watch')
        }
    }
});
