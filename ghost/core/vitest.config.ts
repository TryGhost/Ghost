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
        // 2000ms was inherited from mocha, where a shared require-cache kept
        // per-test work cheap. Under vitest's `isolate: true` the first test
        // in each file pays the cold-import cost of Ghost's server modules,
        // so 2000ms is too tight on a loaded CI runner — the slowest test is
        // ~1s locally and can multiply under contention. 5000ms (vitest's
        // default) removes the timeout-flake class.
        testTimeout: 5000,
        hookTimeout: 60000,
        // Retry a failed test up to twice (3 attempts total) before
        // reporting it as failed. The suite is intermittently flaky on
        // loaded CI runners; this absorbs transient test-level failures
        // (e.g. a slow test brushing the timeout). It does not help
        // worker-level crashes — those are retried at the CI step.
        retry: 2,
        // Local runs use the compact `dot` reporter. CI uses `default`
        // instead — `dot` emits only a stream of dots, so when the run dies
        // the log gives no clue which file was running, whereas `default`
        // names each file. `github-actions` adds inline `::error::`
        // annotations for failed tests.
        reporters: process.env.GITHUB_ACTIONS
            ? ['default', 'github-actions']
            : ['dot'],
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
