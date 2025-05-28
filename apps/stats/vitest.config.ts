import path from 'path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './test/setup.ts',
        include: [
            './test/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            './src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        // Use a basic reporter instead of completely silencing output
        // This provides test results without the noisy warnings
        silent: false,
        reporters: 'basic',
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
            '@test': path.resolve(__dirname, './test'),
            // '@assets': path.resolve(__dirname, './src/assets'),
            '@components': path.resolve(__dirname, './src/components'),
            // '@hooks': path.resolve(__dirname, './src/hooks'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@views': path.resolve(__dirname, './src/views')
        }
    }
}); 