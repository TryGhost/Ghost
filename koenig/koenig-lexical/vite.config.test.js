import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {resolve} from 'path';

// same as demo except without the /Koenig/ base
// used for building a site that is opened via vite's preview() command for e2e tests
//
// we can't use the main vite.config.js build because that only results in a UMD library file
export default defineConfig({
    plugins: [
        svgr(),
        react()
    ],
    define: {
        'process.env.VITEST_SEGFAULT_RETRY': 3
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    test: {}
});
