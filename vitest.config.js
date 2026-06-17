const {defineConfig} = require('vitest/config');

module.exports = defineConfig({
    test: {
        include: ['test/**/*.test.js'],
        coverage: {
            include: ['src/BaseStorage.ts'],
            provider: 'v8',
            reporter: ['text', 'lcov'],
            thresholds: {
                branches: 100,
                functions: 100,
                lines: 100,
                statements: 100
            }
        }
    }
});
