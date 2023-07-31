import commonjs from 'vite-plugin-commonjs';
import pkg from './package.json';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {SUPPORTED_LOCALES} from '@tryghost/i18n';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

// https://vitejs.dev/config/
export default (function viteConfig() {
    return defineConfig({
        plugins: [
            svgr(),
            react(),
            commonjs({
                dynamic: {
                    loose: true
                }
            })
        ],
        define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'process.env.VITEST_SEGFAULT_RETRY': 3
        },
        preview: {
            port: 6174
        },
        build: {
            outDir: resolve(__dirname, 'umd'),
            emptyOutDir: true,
            minify: true,
            sourcemap: true,
            cssCodeSplit: true,
            lib: {
                entry: resolve(__dirname, 'src/index.tsx'),
                formats: ['umd'],
                name: pkg.name,
                fileName(format) {
                    if (format === 'umd') {
                        return `${outputFileName}.min.js`;
                    }

                    return `${outputFileName}.js`;
                }
            },
            rollupOptions: {
                output: {}
            },
            commonjsOptions: {
                include: [/ghost/, /node_modules/],
                dynamicRequireRoot: '../../',
                dynamicRequireTargets: SUPPORTED_LOCALES.map(locale => `../../ghost/i18n/locales/${locale}/signup-form.json`)
            }
        },
        test: {
            globals: true, // required for @testing-library/jest-dom extensions
            environment: 'jsdom',
            setupFiles: './test/test-setup.js',
            include: ['./test/unit/*'],
            testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
            ...(process.env.CI && { // https://github.com/vitest-dev/vitest/issues/1674
                minThreads: 1,
                maxThreads: 2
            })
        }
    });
});
