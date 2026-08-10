/* eslint-env node */
/**
 * Shared Vite config factory for Ghost's public UMD apps — portal,
 * comments-ui, sodo-search, announcement-bar, signup-form, admin-toolbar.
 *
 * Each app loads as a <script src> from a Ghost theme and ships as a UMD
 * (or IIFE) bundle in <app>/umd/<app>.min.js. This factory captures the
 * shape they all share (outDir, lib, baseline plugins) and lets per-app
 * divergence flow through `overrides`, which is deep-merged via Vite's
 * `mergeConfig`. Plugin arrays in `overrides` are appended to the base plugins.
 *
 * Plugin imports are dynamic so an app can opt out (e.g. admin-toolbar
 * uses Preact and never installs `@vitejs/plugin-react`).
 *
 * i18n note: apps import their locales via `@tryghost/i18n/registry/<namespace>`,
 * a static ESM registry any bundler can resolve.
 */
import {resolve} from 'path';
import {defineConfig, mergeConfig} from 'vitest/config';

/**
 * @param {Object} opts
 * @param {string} opts.packageRoot — absolute root of the calling app (typically `import.meta.dirname`)
 * @param {string} opts.packageName — e.g. `'@tryghost/portal'`; sets the UMD/IIFE global name and output filename
 * @param {string} opts.entry — entry path relative to `packageRoot` (e.g. `'src/index.jsx'`)
 * @param {'react'|'preact'} [opts.framework='react'] — controls whether `@vitejs/plugin-react` is included
 * @param {boolean} [opts.svgr=true] — include `vite-plugin-svgr`
 * @param {'umd'|'iife'} [opts.libFormat='umd']
 * @param {string} [opts.libName] — global var name override (default: `packageName`)
 * @param {boolean} [opts.sourcemap=true]
 * @param {boolean} [opts.cssCodeSplit=true]
 * @param {import('vitest/config').UserConfig} [opts.overrides] — deep-merged onto the base config
 * @returns {import('vitest/config').UserConfig}
 */
export function publicAppViteConfig(opts) {
    const {
        packageRoot,
        packageName,
        entry,
        framework = 'react',
        svgr = true,
        libFormat = 'umd',
        libName,
        sourcemap = true,
        cssCodeSplit = true,
        overrides = {}
    } = opts;

    return defineConfig(async (config) => {
        const outputFileName = packageName[0] === '@'
            ? packageName.slice(packageName.indexOf('/') + 1)
            : packageName;

        const plugins = [];
        if (framework === 'react') {
            const {default: reactPlugin} = await import('@vitejs/plugin-react');
            plugins.push(reactPlugin());
        }
        if (svgr) {
            const {default: svgrPlugin} = await import('vite-plugin-svgr');
            plugins.push(svgrPlugin());
        }

        const base = {
            logLevel: process.env.CI ? 'info' : 'warn',
            clearScreen: false,
            plugins,
            define: {
                'process.env.NODE_ENV': JSON.stringify(config.mode)
            },
            build: {
                outDir: resolve(packageRoot, 'umd'),
                emptyOutDir: true,
                reportCompressedSize: false,
                minify: config.mode === 'production',
                sourcemap,
                cssCodeSplit,
                lib: {
                    entry: resolve(packageRoot, entry),
                    formats: [libFormat],
                    name: libName ?? packageName,
                    fileName: () => `${outputFileName}.min.js`
                }
            },
            test: {
                globals: true,
                environment: 'jsdom',
                testTimeout: 10000
            }
        };

        return mergeConfig(base, overrides);
    });
}
