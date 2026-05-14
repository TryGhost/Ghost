import {defineConfig} from 'vitest/config';

// Vitest is being introduced incrementally alongside mocha. Each PR
// expands `test.include` to cover a new bucket. Files outside the
// include glob continue to run under mocha via `pnpm test:base`.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        pool: 'forks',
        env: {
            NODE_ENV: 'testing',
            WEBHOOK_SECRET: 'TEST_STRIPE_WEBHOOK_SECRET'
        },
        include: [
            'test/unit/server/api/**/*.test.{js,ts}'
        ],
        setupFiles: ['./test/utils/vitest-setup.ts'],
        testTimeout: 2000,
        hookTimeout: 60000,
        reporters: ['dot'],
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'html', 'cobertura'],
            exclude: [
                'core/server/data/migrations/**',
                'core/server/data/schema/**',
                'core/server/services/koenig/**',
                'test/**'
            ]
        }
    }
});
