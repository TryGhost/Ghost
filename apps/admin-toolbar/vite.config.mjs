/* eslint-env node */
import {resolve} from 'path';

import {defineConfig} from 'vite';

export default defineConfig(({mode}) => ({
    logLevel: process.env.CI ? 'info' : 'warn',
    clearScreen: false,
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode)
    },
    build: {
        outDir: resolve(import.meta.dirname, 'umd'),
        emptyOutDir: true,
        reportCompressedSize: false,
        minify: mode === 'production',
        sourcemap: false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.js'),
            formats: ['iife'],
            name: 'GhostAdminToolbar',
            fileName: () => 'admin-toolbar.min.js'
        }
    }
}));
