import {resolve} from 'path';
import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import pkg from './package.json';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svgr(),
        react()
    ],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
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
        }
    },
    test: {
        exclude: ['vite.config.test.js']
    }
});
