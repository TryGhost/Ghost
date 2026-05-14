/* eslint-env node */
import {resolve} from 'path';
import fs from 'fs/promises';

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
        preview: {
            host: '0.0.0.0',
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 4175,
            cors: true
        },
        server: {
            port: 5368
        },
        plugins: [
            cssInjectedByJsPlugin(),
            reactPlugin(),
            svgrPlugin()
        ],
        esbuild: {
            loader: 'tsx',
            include: [/src\/.*\.[jt]sx?$/, /__mocks__\/.*\.[jt]sx?$/, /test\/.*\.[jt]sx?$/],
            exclude: []
        },
        optimizeDeps: {
            esbuildOptions: {
                plugins: [
                    {
                        name: 'load-js-files-as-jsx',
                        setup(build) {
                            build.onLoad({filter: /src\/.*\.js$/}, async args => ({
                                loader: 'jsx',
                                contents: await fs.readFile(args.path, 'utf8')
                            }));
                        }
                    }
                ]
            }
        },
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        build: {
            outDir: resolve(__dirname, 'umd'),
            emptyOutDir: true,
            reportCompressedSize: false,
            minify: true,
            sourcemap: true,
            cssCodeSplit: false,
            lib: {
                entry: resolve(__dirname, 'src/index.js'),
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
            // The first test in a heavy integration-style file (e.g. upgrade-flow,
            // which runs the full Portal app under JSDOM) pays a module-loading
            // and JIT warm-up cost on top of its actual work. Hardcoding 10s
            // left flakes when CI workers were slow; 20s gives clear headroom
            // for warm-up while still keeping the suite honest. Other Ghost
            // apps use the same env-var override pattern for one-off CI bumps.
            testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 20000,
            coverage: {
                reporter: ['cobertura', 'text-summary', 'html']
            }
        }
    };
});
