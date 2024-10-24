import {resolve} from 'path';
import fs from 'fs/promises';

import {defineConfig} from 'vitest/config';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import reactPlugin from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';

import pkg from './package.json';

import {SUPPORTED_LOCALES} from '@tryghost/i18n';

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
            port: 4175
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
            loader: 'jsx',
            include: /src\/.*\.jsx?$/,
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
                dynamicRequireTargets: SUPPORTED_LOCALES.map(locale => `../../ghost/i18n/locales/${locale}/portal.json`)
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/setupTests.js',
            testTimeout: 10000
        }
    };
});
