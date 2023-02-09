import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {resolve} from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svgr(),
        react()
    ],
    base: '/',
    optimizeDeps: {
        include: [
            '@tryghost/kg-clean-basic-html',
            '@tryghost/kg-markdown-html-renderer',
            '@tryghost/kg-simplemde'
        ]
    },
    build: {
        commonjsOptions: {
            include: [/packages/, /node_modules/]
        },
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    }
});
