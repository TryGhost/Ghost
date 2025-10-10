/* eslint-env node */
import {resolve} from 'path';
import {defineConfig} from 'vitest/config';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import reactPlugin from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';
import esbuild from 'rollup-plugin-esbuild';
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
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 4175,
            cors: true
        },
        server: {
            port: 5368
        },
        plugins: [
            cssInjectedByJsPlugin(),
            reactPlugin({
                jsxRuntime: 'automatic',
                // this is a no-op, it's here to stop vite from dropping its JSX
                // transform because it sees we have TypeScript enabled.
                // Necessary for `define` to work otherwise is sees raw JSX
                babel: {
                    plugins: [
                        ['@babel/plugin-transform-react-jsx', {runtime: 'automatic'}]
                    ]
                }
            }),
            svgrPlugin()
        ],
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
                    if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
                        return;
                    }
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
