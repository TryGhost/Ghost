import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'cobertura'],
            // Tune these for your package. New server-side libs aim high.
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 80,
                statements: 100
            }
        }
    }
});
