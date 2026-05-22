import path from 'node:path';
import {defineConfig} from 'vitest/config';

// ghost/core's unit tests run under vitest. The DB-backed integration,
// e2e-api, and legacy suites still run under mocha via `pnpm test:base`
// — see ghost/core/package.json.
//
// The unit suite is split into two vitest projects:
//
//  - `unit` runs with `isolate: false` — one shared module registry per
//    worker (the model mocha always used). Ghost's server modules are
//    heavy; isolating each file cold-imports them ~550 times over, which
//    is roughly an order of magnitude slower.
//  - `unit-isolated` runs the handful of files that are not yet safe
//    under a shared registry: they fail intermittently when run alongside
//    other files (root causes still under investigation). They run with
//    `isolate: true` until fixed, then move into `unit`.

// Files quarantined to the isolated project. Keep this list short — each
// entry is a known bug to fix, not a permanent home.
const isolatedFiles = [
    'test/unit/bin/create-migration.test.js',
    'test/unit/frontend/helpers/asset.test.js',
    'test/unit/frontend/services/routing/taxonomy-router.test.js',
    'test/unit/server/adapters/scheduling/scheduling-default.test.js',
    'test/unit/server/services/public-config/config.test.js',
    'test/unit/server/services/themes/upload-size-limit-reporter.test.js'
];

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

// Configuration shared by both projects.
const sharedConfig = {
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
    testTimeout: 5000,
    hookTimeout: 60000,
    // Retry a failed test up to twice (3 attempts total) before reporting
    // it as failed — absorbs transient flakiness on loaded CI runners.
    retry: 2
};

export default defineConfig({
    test: {
        // Removes the per-worker session sqlite databases after the run.
        globalSetup: ['./test/utils/vitest-global-setup.ts'],
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
                test: {
                    ...sharedConfig,
                    name: 'unit',
                    isolate: false,
                    include: ['test/unit/**/*.test.{js,ts}'],
                    exclude: ['**/node_modules/**', ...isolatedFiles]
                }
            },
            {
                test: {
                    ...sharedConfig,
                    name: 'unit-isolated',
                    isolate: true,
                    include: isolatedFiles,
                    exclude: ['**/node_modules/**']
                }
            }
        ]
    }
});
