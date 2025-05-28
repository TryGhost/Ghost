import path from 'path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './test/setup.ts',
        coverage: {
            reporter: ['text', 'html'],
            exclude: [
                'node_modules/',
                'test/'
            ]
        }
    },
    resolve: {
        alias: {
            '@src': path.resolve(__dirname, './src'),
            '@test': path.resolve(__dirname, './test')
        }
    }
}); 