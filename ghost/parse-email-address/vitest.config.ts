import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'cobertura'],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 80,
                statements: 100
            }
        }
    }
});
