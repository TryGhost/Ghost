/* eslint-env node */
import {resolve} from 'path';

import {defineConfig} from 'vite';

// `vite preview` aborts when its outDir is missing — a UX nudge for the
// "did you forget to build?" case. Our dev script runs preview alongside
// `build:watch`, so the dir is missing for the first ~1s after a fresh
// clone or `build:clean`. Defining configurePreviewServer is Vite's
// documented opt-out from that guard; the underlying sirv server already
// 404s for missing files.
const tolerateMissingOutDir = () => ({
    name: 'tolerate-missing-outdir',
    configurePreviewServer() {}
});

export default defineConfig(({mode}) => ({
    logLevel: process.env.CI ? 'info' : 'warn',
    clearScreen: false,
    plugins: [tolerateMissingOutDir()],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode)
    },
    preview: {
        host: '0.0.0.0',
        allowedHosts: true, // allows domain-name proxies to the preview server
        port: 4176
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
