import path from 'node:path';
import {defineConfig} from 'vitest/config';

// ghost/core's unit tests run under vitest. The DB-backed integration,
// e2e-api, and legacy suites run under vitest too, via the separate
// vitest.config.db.ts — see ghost/core/package.json.
//
// The whole unit suite runs in a single `unit` project with `isolate: false`
// — one shared module registry per worker (the model mocha always used).
// Ghost's server modules are heavy; isolating each file cold-imports them
// ~550 times over, which is roughly an order of magnitude slower. Files that
// share a worker therefore share module state, so a test that mutates a
// singleton (config, a sinon stub on a shared module, the sentry require-cache
// entry, a live timer/HTTP client) must restore it or it leaks into whichever
// file runs next.

// Ghost's snapshot tests use @tryghost/jest-snapshot, which manages its own
// `__snapshots__/*.snap` files. Point vitest's *native* snapshot system at a
// separate (never-written) path so it doesn't adopt those files, rewrite
// their headers, or report their entries as obsolete — obsolete snapshots
// fail the run under CI. Applied at both the root and per-project level so
// it takes effect regardless of how vitest resolves config across projects.
const resolveSnapshotPath = (testPath: string, snapExtension: string) => path.join(
    path.dirname(testPath),
    '__vitest_snapshots__',
    path.basename(testPath) + snapExtension
);

const unitConfig = {
    globals: true,
    environment: 'node' as const,
    // The `forks` pool deadlocks at teardown once the run is large enough
    // (main process + a final idle worker, both parked in the event loop,
    // no summary printed). `threads` tears workers down with
    // worker.terminate() and is unaffected; it's also faster here.
    pool: 'threads' as const,
    env: {
        NODE_ENV: 'testing',
        WEBHOOK_SECRET: 'TEST_STRIPE_WEBHOOK_SECRET'
    },
    setupFiles: ['./test/utils/vitest-setup.ts'],
    resolveSnapshotPath,
    // 5000ms (vitest's default) — generous headroom over the slowest unit
    // test (~1s locally) for loaded CI runners.
    testTimeout: 5000
};

export default defineConfig({
    test: {
        resolveSnapshotPath,
        // Local runs use the compact `dot` reporter. CI uses `default`
        // (names each file) plus `github-actions` for inline annotations.
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
        },
        projects: [
            {
                // Vitest projects re-create their own Vite config — settings on
                // the parent `defineConfig` aren't inherited here. The unit
                // runner uses Vite's SSR pipeline, so workspace TS deps with a
                // `source` exports condition (e.g. @tryghost/parse-email-address)
                // need `ssr.resolve.conditions` to resolve to src/*.ts. Matches
                // the runtime backend's `--conditions=source` (nodemon.json).
                ssr: {resolve: {conditions: ['source', 'node']}},
                test: {
                    ...unitConfig,
                    name: 'unit',
                    isolate: false,
                    include: ['test/unit/**/*.test.{js,ts}'],
                    exclude: ['**/node_modules/**']
                }
            }
        ]
    }
});
