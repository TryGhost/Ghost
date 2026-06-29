/* eslint-env node */
import {resolve} from 'path';

import {defineConfig} from 'vitest/config';
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
            host: '0.0.0.0',
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 4177
        },
        plugins: [
            reactPlugin(),
            svgrPlugin()
        ],
        build: {
            outDir: resolve(__dirname, 'umd'),
            emptyOutDir: true,
            reportCompressedSize: false,
            minify: config.mode === 'production',
            sourcemap: true,
            cssCodeSplit: true,
            lib: {
                entry: resolve(__dirname, 'src/index.jsx'),
                formats: ['umd'],
                name: pkg.name,
                fileName: format => `${outputFileName}.min.js`
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './test/setup-tests.js',
            testTimeout: 10000
        }
    };
});
