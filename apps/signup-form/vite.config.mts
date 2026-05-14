import pkg from './package.json';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

// https://vitejs.dev/config/
export default (function viteConfig() {
    return defineConfig({
        logLevel: process.env.CI ? 'info' : 'warn',
        plugins: [
            svgr(),
            react()
        ],
        define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'process.env.VITEST_SEGFAULT_RETRY': 3
        },
        preview: {
            host: '0.0.0.0',
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 6174
        },
        optimizeDeps: {
            include: ['@tryghost/i18n', '@tryghost/debug']
        },
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        build: {
            outDir: resolve(__dirname, 'umd'),
            reportCompressedSize: false,
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
                // Use a single glob instead of expanding SUPPORTED_LOCALES into
                // ~60 explicit paths. Under vite 7's bundled
                // @rollup/plugin-commonjs, each entry triggers a full directory
                // crawl from dynamicRequireRoot (= repo root) at the start of
                // the build, so the N-paths form adds ~1 second per locale.
                // The glob is resolved by a single crawl and produces the same
                // bundle output.
                dynamicRequireTargets: ['../../ghost/i18n/locales/*/signup-form.json']
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
