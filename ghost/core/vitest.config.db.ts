import path from 'node:path';
import {defineConfig} from 'vitest/config';

// DB-backed suite runner (integration / e2e / legacy) — separate from the unit
// vitest.config.ts because these suites need a fundamentally different execution
// model.
//
//  - pool 'threads' + isolate:false + fileParallelism:false → a single worker
//    with one shared module registry, running files sequentially. Ghost's server
//    is effectively a process-wide singleton (db/knex, @tryghost/domain-events,
//    the jobs manager, nconf, the settings cache, the url service) that is reset
//    in place between boots, never duplicated — so exactly one Ghost can exist
//    per process. That's the same constraint mocha ran these suites under.
//  - threads, not forks, so the worker is torn down with worker.terminate() at
//    the end of the run — sidestepping the forks-teardown deadlock noted in
//    vitest.config.ts. (A parallel model — a fork per worker, each with its own
//    provisioned DB — is the follow-up; it needs clean per-worker teardown.)
//  - test/utils/vitest-setup-db.ts provisions a per-session DB + port and
//    bridges @tryghost/express-test's snapshot/mocha hooks onto vitest.
//
// Suites move onto vitest one at a time. As each ports, add (or widen) a project
// below and drop that directory from the mocha run in package.json (`test:base`
// globs the rest). Today only e2e-webhooks has moved.

// Ghost's snapshot tests use @tryghost/jest-snapshot, which manages its own
// __snapshots__/*.snap files. Point vitest's *native* snapshot system at a
// separate, never-written path so it doesn't adopt those files, rewrite their
// headers, or report their entries as obsolete (obsolete snapshots fail CI).
const resolveSnapshotPath = (testPath: string, snapExtension: string) => path.join(
    path.dirname(testPath),
    '__vitest_snapshots__',
    path.basename(testPath) + snapExtension
);

// Shared by every DB-backed project — the execution model is identical for all
// of them; only the include globs and per-suite timeouts differ.
const sharedDbConfig = {
    globals: true,
    environment: 'node' as const,
    pool: 'threads' as const,
    isolate: false,
    fileParallelism: false,
    setupFiles: ['./test/utils/vitest-setup-db.ts'],
    resolveSnapshotPath,
    // Keep the testing env (CI sets `testing-mysql` on the MySQL leg; default to
    // sqlite `testing` locally). Must reject vitest's own `NODE_ENV='test'`
    // default — Ghost has no config.test.json, so `test` yields no DB config and
    // bookshelf throws "Invalid knex instance". Resolved here in the main
    // process, where CI sets the leg's NODE_ENV.
    env: {
        NODE_ENV: process.env.NODE_ENV?.startsWith('testing') ? process.env.NODE_ENV : 'testing',
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET'
    },
    hookTimeout: 60000
};

export default defineConfig({
    test: {
        resolveSnapshotPath,
        // Local runs use the compact `dot` reporter. CI uses `default` plus
        // `github-actions` for inline annotations (mirrors vitest.config.ts).
        reporters: process.env.GITHUB_ACTIONS
            ? ['default', 'github-actions']
            : ['dot'],
        projects: [
            {
                test: {
                    ...sharedDbConfig,
                    name: 'e2e',
                    // Widens to e2e-api / e2e-frontend as they port.
                    include: [
                        'test/e2e-webhooks/**/*.test.{js,ts}',
                        'test/e2e-server/**/*.test.{js,ts}'
                    ],
                    exclude: ['**/node_modules/**'],
                    // Matches the mocha `--timeout=15000` for the e2e suites.
                    testTimeout: 15000
                }
            }
            // Added as these suites port (see the note at the top of the file):
            //   {test: {...sharedDbConfig, name: 'integration',
            //       include: ['test/integration/**/*.test.{js,ts}'],
            //       exclude: ['**/node_modules/**'], testTimeout: 10000}},
            //   {test: {...sharedDbConfig, name: 'legacy',
            //       include: ['test/legacy/**/*.test.{js,ts}'],
            //       exclude: ['**/node_modules/**'], testTimeout: 60000}}
        ]
    }
});
