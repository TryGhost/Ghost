import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        include: [
            './test/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            './src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        // Use a basic reporter instead of completely silencing output
        // This provides test results without the noisy warnings
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
            // '@assets': resolve(__dirname, './src/assets'),
            '@components': resolve(__dirname, './src/components'),
            // '@hooks': resolve(__dirname, './src/hooks'),
            '@utils': resolve(__dirname, './src/utils'),
            '@views': resolve(__dirname, './src/views')
        }
    }
}); 