const path = require('path');
const {defineConfig} = require('vitest/config');

module.exports = defineConfig({
    resolve: {
        alias: {
            '@tryghost/parse-email-address': path.resolve(__dirname, '../parse-email-address/src/index.ts')
        }
    },
    test: {
        environment: 'node',
        fileParallelism: false,
        globalSetup: ['./test/utils/vitest.global-setup.js'],
        globals: true,
        include: ['test/unit/**/*.test.{js,ts}'],
        pool: 'threads',
        setupFiles: ['./test/utils/vitest.setup.js'],
        testTimeout: 2000,
        coverage: {
            provider: 'v8',
            reporter: [
                'html-spa',
                'text-summary',
                'cobertura'
            ],
            thresholds: {
                statements: 61,
                branches: 56,
                functions: 59,
                lines: 61
            },
            include: [
                'core/*.js',
                'core/{frontend,server,shared}/**/*.{js,ts}'
            ],
            exclude: [
                'core/frontend/src/**',
                'core/frontend/public/**',
                'core/server/data/migrations/**',
                'core/server/data/schema/schema.js',
                'core/frontend/web/!(middleware)/**',
                'core/server/web/**/app.js',
                'core/server/web/api/testmode/**',
                'core/server/web/parent/**',
                'core/server/api/endpoints/!(utils)/**',
                'core/server/services/email-analytics/jobs/**',
                'core/server/services/members/jobs/**',
                'core/server/services/email-service/wrapper.js',
                'core/server/services/**/service.js'
            ]
        }
    }
});
