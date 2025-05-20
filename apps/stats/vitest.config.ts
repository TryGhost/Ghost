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
        // Use default reporter for cleaner output
        silent: false,
        reporters: 'default',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            include: [
                'src/hooks/**/*.{js,jsx,ts,tsx}',
                'src/utils/**/*.{js,jsx,ts,tsx}'
            ],
            exclude: [
                'src/**/*.d.ts'
            ],
            all: true
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