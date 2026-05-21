import path from 'node:path';
import {defineConfig} from 'vitest/config';

// Vitest runs all of ghost/core's unit tests (test/unit). The DB-backed
// integration, e2e-api, and legacy suites still run under mocha via
// `pnpm test:base` — see ghost/core/package.json.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // The `forks` pool deadlocks at teardown once the run is large enough
        // (main process + a final idle worker, both parked in the event loop,
        // no summary printed). `threads` tears workers down with
        // worker.terminate() and is unaffected; it's also faster here.
        pool: 'threads',
        env: {
            NODE_ENV: 'testing',
            WEBHOOK_SECRET: 'TEST_STRIPE_WEBHOOK_SECRET'
        },
        include: [
            'test/unit/**/*.test.{js,ts}'
        ],
        exclude: [
            '**/node_modules/**'
        ],
        setupFiles: ['./test/utils/vitest-setup.ts'],
        // Ghost's snapshot tests use @tryghost/jest-snapshot, which manages
        // its own `__snapshots__/*.snap` files. Point vitest's native
        // snapshot system at a separate (never-written) path so it doesn't
        // adopt those files and report their entries as obsolete.
        resolveSnapshotPath: (testPath: string, snapExtension: string) => path.join(
            path.dirname(testPath),
            '__vitest_snapshots__',
            path.basename(testPath) + snapExtension
        ),
        testTimeout: 2000,
        hookTimeout: 60000,
        // `dot` keeps local/CI output compact. `github-actions` adds inline
        // `::error::` annotations for failed tests — without it, CI logs only
        // show vitest's dot stream, whose failure summary GitHub truncates,
        // making it impossible to tell which test failed from the logs.
        reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : ['dot'],
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
