import {resolve} from 'path';
import fs from 'fs/promises';

import {defineConfig} from 'vitest/config';
import commonjs from 'vite-plugin-commonjs';
import reactPlugin from '@vitejs/plugin-react';
import svgrPlugin from 'vite-plugin-svgr';

import pkg from './package.json';

export default defineConfig((config) => {
    const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

    return {
        logLevel: process.env.CI ? 'info' : 'warn',
        clearScreen: false,
        define: {
            'process.env.NODE_ENV': JSON.stringify(config.mode)
        },
        preview: {
            port: 4178
        },
        plugins: [
            reactPlugin(),
            svgrPlugin(),
            commonjs({
                dynamic: {
                    loose: true
                }
            })
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
            reportCompressedSize: false,
            emptyOutDir: true,
            minify: true,
            sourcemap: true,
            cssCodeSplit: true,
            lib: {
                entry: resolve(__dirname, 'src/index.js'),
                formats: ['umd'],
                name: pkg.name,
                fileName: format => `${outputFileName}.min.js`
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
