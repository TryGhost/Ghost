import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.js'],
        testTimeout: 60000
    }
});
