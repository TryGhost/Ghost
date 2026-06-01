/* eslint-env node */
import {resolve} from 'path';

import {defineConfig} from 'vite';

export default defineConfig({
    logLevel: process.env.CI ? 'info' : 'warn',
    clearScreen: false,
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    preview: {
        allowedHosts: true,
        port: 4176
    },
    build: {
        outDir: resolve(import.meta.dirname, 'umd'),
        emptyOutDir: true,
        reportCompressedSize: false,
        minify: true,
        sourcemap: false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/index.js'),
            formats: ['iife'],
            name: 'GhostAdminToolbar',
            fileName: () => 'admin-toolbar.min.js'
        }
    }
});
