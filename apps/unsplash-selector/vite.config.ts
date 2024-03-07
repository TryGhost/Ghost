import pkg from './package.json';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {defineConfig} from 'vite';
import {resolve} from 'path';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

export default defineConfig({
    plugins: [svgr(), react()],
    build: {
        minify: true,
        sourcemap: true,
        cssCodeSplit: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: pkg.name,
            fileName(format) {
                if (format === 'umd') {
                    return `${outputFileName}.umd.js`;
                }

                return `${outputFileName}.js`;
            }
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom'
            ],
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
    }
});
