import react from '@vitejs/plugin-react';
import glob from 'glob';
import {resolve} from 'path';
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
        outDir: 'dist',
        lib: {
            formats: ['es', 'cjs'],
            entry: glob.sync(resolve(__dirname, 'src/**/*.{ts,tsx}')).reduce((entries, path) => {
                if (path.includes('.stories.') || path.endsWith('.d.ts')) {
                    return entries;
                }

                const outPath = path.replace(resolve(__dirname, 'src') + '/', '').replace(/\.(ts|tsx)$/, '');
                entries[outPath] = path;
                return entries;
            }, {} as Record<string, string>)
        },
        commonjsOptions: {
            include: [/packages/, /node_modules/]
        },
        rollupOptions: {
            external: (source) => {
                if (source.startsWith('.')) {
                    return false;
                }

                if (source.includes('node_modules')) {
                    return true;
                }

                return !source.includes(__dirname);
            }
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['./test/unit/**/*'],
        setupFiles: ['./test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html']
        },
        testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
        ...(process.env.CI && {
            minThreads: 1,
            maxThreads: 2
        })
    }
});
