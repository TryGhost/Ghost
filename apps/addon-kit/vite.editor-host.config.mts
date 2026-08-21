import {defineConfig} from 'vite';
import {resolve} from 'node:path';

export default defineConfig({
    build: {
        outDir: resolve(import.meta.dirname, 'dist'),
        emptyOutDir: false,
        lib: {
            entry: resolve(import.meta.dirname, 'src/host/editor-entry.ts'),
            formats: ['es'],
            fileName: () => 'editor-host.mjs'
        },
        rollupOptions: {
            external: [
                '@quilted/threads',
                '@tryghost/addon-kit/bootstrap'
            ]
        }
    }
});
