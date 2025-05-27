import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
    logLevel: process.env.CI ? 'info' : 'warn',
    plugins: [
        svgr(),
        react(),
        cssInjectedByJsPlugin()
    ],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.VITEST_SEGFAULT_RETRY': 3
    },
    preview: {
        port: 4174
    },
    build: {
        reportCompressedSize: false,
        minify: true,
        sourcemap: true,
        lib: {
            formats: ['es'],
            entry: './src/index.tsx',
            name: '@tryghost/admin-x-framework',
            fileName: () => 'admin-x-framework.js'
        },
        commonjsOptions: {
            include: [/packages/, /node_modules/]
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['./test/unit/**/*'],
        setupFiles: ['./test/setup.ts'],
        testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
        ...(process.env.CI && {
            minThreads: 1,
            maxThreads: 2
        })
    }
});
