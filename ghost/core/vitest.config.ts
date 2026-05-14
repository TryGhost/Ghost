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
            'test/unit/bin/**/*.test.{js,ts}',
            'test/unit/shared/**/*.test.{js,ts}',
            'test/unit/server/adapters/**/*.test.{js,ts}',
            'test/unit/server/api/**/*.test.{js,ts}',
            'test/unit/server/data/**/*.test.{js,ts}',
            'test/unit/server/lib/**/*.test.{js,ts}',
            'test/unit/server/web/**/*.test.{js,ts}'
        ],
        // Files using the mocha `done()` callback — vitest 4.x removed
        // support. Pending follow-up PR that converts these to promises.
        exclude: [
            'test/unit/server/adapters/scheduling/scheduling-default.test.js',
            'test/unit/server/adapters/storage/local-images-storage.test.js',
            'test/unit/server/lib/image/blog-icon.test.js',
            'test/unit/server/lib/image/gravatar.test.js',
            'test/unit/server/lib/package-json/parse.test.js',
            'test/unit/server/web/api/middleware/cors.test.js',
            '**/node_modules/**'
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
