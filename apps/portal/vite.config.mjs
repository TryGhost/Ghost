/* eslint-env node */
import {resolve} from 'path';
import fs from 'fs/promises';

import {defineConfig} from 'vitest/config';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import reactPlugin from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';
import esbuild from 'rollup-plugin-esbuild';
import {transform} from 'esbuild';

import pkg from './package.json';

import {SUPPORTED_LOCALES} from '@tryghost/i18n';

// Custom plugin to pre-transform JSX in .js files using esbuild
// This runs before the define plugin so that define's esbuild can parse the files
function jsxInJsPlugin() {
    return {
        name: 'jsx-in-js',
        enforce: 'pre',
        async transform(code, id) {
            // Only transform .js files in src directory
            if (id.includes('/src/') && id.endsWith('.js')) {
                try {
                    const result = await transform(code, {
                        loader: 'jsx',
                        jsx: 'transform',
                        jsxFactory: 'React.createElement',
                        jsxFragment: 'React.Fragment',
                        target: 'es2015',
                        sourcefile: id
                    });

                    // Add React import if JSX was found and React isn't already imported
                    if (result.code.includes('React.createElement') && !code.includes('import React')) {
                        return {
                            code: `import React from 'react';\n${result.code}`,
                            map: result.map || null
                        };
                    }

                    return {
                        code: result.code,
                        map: result.map || null
                    };
                } catch (e) {
                    // If transform fails, return null to let other plugins handle it
                    return null;
                }
            }
            return null;
        }
    };
}

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
            jsxInJsPlugin(),
            cssInjectedByJsPlugin(),
            reactPlugin(),
            svgrPlugin()
        ],
        esbuild: {
            jsxInject: `import React from 'react'`
        },
        optimizeDeps: {
            esbuildOptions: {
                loader: {
                    '.js': 'jsx'
                }
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
                },
                plugins: [
                    esbuild({
                        target: 'es2015',
                        include: /\.[jt]sx?$/,
                        exclude: /node_modules/,
                        sourceMap: true,
                        minify: false,
                        jsx: 'transform',
                        jsxFactory: 'React.createElement',
                        jsxFragment: 'React.Fragment',
                        jsxImportSource: 'react',
                        loaders: {
                            '.js': 'jsx',
                            '.jsx': 'jsx',
                            '.ts': 'tsx',
                            '.tsx': 'tsx'
                        }
                    })
                ],
                onwarn(warning, warn) {
                    // Suppress certain warnings
                    if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
                    warn(warning);
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
