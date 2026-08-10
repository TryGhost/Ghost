/* eslint-env node */
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: '@tryghost/admin-toolbar',
    entry: 'src/index.js',
    framework: 'preact',
    svgr: false,
    libFormat: 'iife',
    libName: 'GhostAdminToolbar',
    sourcemap: false
});
