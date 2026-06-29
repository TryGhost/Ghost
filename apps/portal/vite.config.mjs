/* eslint-env node */
import {resolve} from 'path';

import {defineConfig} from 'vitest/config';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import reactPlugin from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';

import pkg from './package.json';

export default defineConfig((config) => {
    const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

    return {
        logLevel: process.env.CI ? 'info' : 'warn',
        clearScreen: false,
        define: {
            'process.env.NODE_ENV': JSON.stringify(config.mode),
            REACT_APP_VERSION: JSON.stringify(process.env.npm_package_version)
        },
        plugins: [
            cssInjectedByJsPlugin(),
            reactPlugin(),
            svgrPlugin()
        ],
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        build: {
            outDir: resolve(__dirname, 'umd'),
            emptyOutDir: true,
            reportCompressedSize: false,
            minify: config.mode === 'production',
            sourcemap: true,
            cssCodeSplit: false,
            lib: {
                entry: resolve(__dirname, 'src/index.jsx'),
                formats: ['umd'],
                name: pkg.name,
                fileName: format => `${outputFileName}.min.js`
            },
            rollupOptions: {
                output: {
                    manualChunks: false
                }
            },
            commonjsOptions: {
                include: [/ghost/, /node_modules/],
                dynamicRequireRoot: '../../',
                // Single glob expands to all SUPPORTED_LOCALES; passing each
                // locale as an explicit path triggers a full repo-root
                // directory crawl per entry under vite 7's bundled
                // @rollup/plugin-commonjs, adding ~1s per locale to build time.
                dynamicRequireTargets: ['../../ghost/i18n/locales/*/portal.json']
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './test/setup-tests.js',
            testTimeout: 10000,
            coverage: {
                reporter: ['cobertura', 'text-summary', 'html']
            }
        }
    };
});
