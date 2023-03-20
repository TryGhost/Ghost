import pkg from './package.json';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svgr(),
        react()
    ],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.VITEST_SEGFAULT_RETRY': 3
    },
    resolve: {
        alias: {
            // required to prevent double-bundling of yjs due to cjs/esm mismatch
            // (see https://github.com/facebook/lexical/issues/2153)
            yjs: resolve('../../node_modules/yjs/src/index.js')
        }
    },
    optimizeDeps: {
        include: [
            '@tryghost/kg-clean-basic-html',
            '@tryghost/kg-markdown-html-renderer',
            '@tryghost/kg-simplemde'
        ]
    },
    build: {
        minify: true,
        sourcemap: true,
        cssCodeSplit: true,
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: pkg.name,
            fileName(format) {
                if (format === 'umd') {
                    return `${outputFileName}.umd.js`;
                }

                return `${outputFileName}.js`;
            }
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                }
            }
        },
        commonjsOptions: {
            include: [/packages/, /node_modules/]
        }
    },
    test: {
        globals: true, // required for @testing-library/jest-dom extensions
        environment: 'jsdom',
        setupFiles: './test/test-setup.js',
        globalSetup: './test/e2e-setup.js',
        testTimeout: 10000
    }
});
