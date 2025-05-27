import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup/vitest.setup.ts'],
        include: ['./test/unit/**/*.test.{ts,tsx}'],
        coverage: {
            reporter: ['text', 'lcov', 'html'],
            exclude: [
                'node_modules/',
                'test/'
            ]
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
}); 