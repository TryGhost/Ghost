import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        // setupFiles: ['./test/setup.ts'],
        include: [
            './test/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            './src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        silent: false,
        reporters: 'basic',
        coverage: {
            include: ['src/utils/**/*.ts'],
            reporter: ['text', 'lcov'],
            all: true,
            provider: 'v8',
            thresholds: {
                lines: 100,
                functions: 100,
                statements: 100
            }
        }
    },
    resolve: {
        alias: {
            '@src': resolve(__dirname, './src'),
            '@components': resolve(__dirname, './src/components'),
            '@utils': resolve(__dirname, './src/utils'),
            '@views': resolve(__dirname, './src/views')
        }
    }
}); 