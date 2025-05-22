import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.js'],
        include: ['./test/unit/**/*.test.{ts,tsx}'],
        coverage: {
            reporter: ['text', 'lcov', 'html'],
            exclude: [
                'node_modules/',
                'test/'
            ]
        }
    }
}); 