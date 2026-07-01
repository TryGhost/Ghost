import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.js'],
        coverage: {
            provider: 'v8',
            include: [
                'index.js',
                'lib/**/*.js'
            ],
            reporter: ['text', 'cobertura'],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100
            }
        }
    }
});
