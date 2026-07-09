import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'cobertura'],
            include: ['src/**'],
            all: true,
            // Preserves the mocha suite's `c8 --check-coverage` gate (lines >= 90%).
            thresholds: {lines: 90}
        }
    }
});
