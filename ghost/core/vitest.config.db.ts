import path from 'node:path';
import {defineConfig} from 'vitest/config';

// DB-backed suite runner (integration / e2e / legacy) — separate from the unit
// vitest.config.ts because these suites boot a real Ghost against a database.
//
//  - pool 'forks' + isolate:false → N child processes, each booting ONE Ghost
//    against its own per-process database + port (derived in vitest-setup-db.ts
//    before Ghost's config loads). Within a fork, files run serially sharing that
//    single Ghost (Ghost's db/knex, @tryghost/domain-events, the jobs manager,
//    nconf, the settings cache and the url service are process-wide singletons
//    reset in place between boots, never duplicated — exactly one Ghost per
//    process, the constraint mocha ran under). Across forks, files shard in
//    parallel — the speedup over the old serial model (~4x locally).
//  - forks, not threads: worker threads share one process.env, so the
//    per-process DB derivation would collide. Separate processes each get their
//    own env → collision-free DBs, the same isolation each mocha process had.
//    (The forks-teardown deadlock the unit config avoids does not reproduce here
//    on vitest 4 — the heavy DB forks exit cleanly.)
//  - test/utils/vitest-setup-db.ts provisions the per-process DB + port and
//    bridges @tryghost/express-test's snapshot hooks onto vitest.
//
// Every DB-backed suite (integration / e2e / e2e-api / legacy) now runs here;
// each is a project below, keyed by its include globs.

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
    // forks (one child process per worker) + isolate:false → each fork boots a
    // single Ghost against its own per-process DB+port (derived in
    // vitest-setup-db.ts) and runs its share of files serially, sharing that one
    // Ghost; files shard across forks in parallel. Threads can't do this: worker
    // threads share process.env, so the per-process DB derivation would collide.
    pool: 'forks' as const,
    isolate: false,
    setupFiles: ['./test/utils/vitest-setup-db.ts'],
    resolveSnapshotPath,
    // Keep the testing env (CI sets `testing-mysql` on the MySQL leg; default to
    // sqlite `testing` locally). Must reject vitest's own `NODE_ENV='test'`
    // default — Ghost has no config.test.json, so `test` yields no DB config and
    // bookshelf throws "Invalid knex instance". Resolved here in the main
    // process, where CI sets the leg's NODE_ENV.
    env: {
        NODE_ENV: process.env.NODE_ENV?.startsWith('testing') ? process.env.NODE_ENV : 'testing',
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET',
        // Bree runs jobs in worker_threads that inherit this NODE_OPTIONS; tsx lets
        // them require() Ghost's .ts sources (job files pull in e.g.
        // labs-flag-overrides.ts). The old mocha lane got tsx from `--node-option
        // import=tsx`; vitest only registers tsx in-process (not in the fork
        // execArgv worker_threads inherit) and ignores poolOptions.forks.execArgv
        // here, so route it through the env. Applied on test.env (after fork
        // startup) so only the spawned workers pick it up, not the fork. (PLA-157/158)
        NODE_OPTIONS: (process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + ' ' : '') + '--import tsx'
    },
    hookTimeout: 60000
};

export default defineConfig({
    test: {
        resolveSnapshotPath,
        // Build ONE migrated+seeded "template" database for the whole run, before
        // any worker fork spawns; each fork then restores its per-process DB from
        // that template (a cheap bulk copy) on first provision instead of running
        // a full migrate+seed per file. This is the lever for the MySQL
        // acceptance-test runtime regression (PLA-165) — per-file migrate+seed is
        // its dominant cost. Defined at the root (not per-project) so a single
        // template is shared across every project in the invocation. See
        // test/utils/vitest-global-db-setup.ts and test/utils/db-template.js.
        globalSetup: ['./test/utils/vitest-global-db-setup.ts'],
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
                    // Widens to e2e-api as it ports.
                    include: [
                        'test/e2e-webhooks/**/*.test.{js,ts}',
                        'test/e2e-server/**/*.test.{js,ts}',
                        'test/e2e-frontend/**/*.test.{js,ts}'
                    ],
                    exclude: ['**/node_modules/**'],
                    // Matches the mocha `--timeout=15000` for the e2e suites.
                    testTimeout: 15000
                }
            },
            {
                test: {
                    ...sharedDbConfig,
                    name: 'integration',
                    // isolate:true (overriding the shared default) gives each file
                    // its own fork → its own fresh per-process DB + Ghost. The
                    // integration suite has inter-file state pollution that the old
                    // fixed serial order masked but nondeterministic fork sharding
                    // exposes — e.g. migration.test.js can leave a rolled-back
                    // schema that a co-located file then inherits. Per-file
                    // isolation removes it by construction. The e2e project keeps
                    // isolate:false (it has no such pollution and is fastest that
                    // way); sqlite per-file init is cheap so the cost here is small.
                    isolate: true,
                    include: ['test/integration/**/*.test.{js,ts}'],
                    exclude: ['**/node_modules/**'],
                    // Probes the optional Docker services (Redis, MinIO) once in
                    // the main process and exports GHOST_TEST_{REDIS,MINIO}_AVAILABLE
                    // so the adapter suites skip when their service is down and run
                    // when it's up. Integration-only — no adapter tests live in the
                    // other DB suites. (PLA-170)
                    globalSetup: ['./test/utils/vitest-globalsetup-services.ts'],
                    // Matches the mocha `--timeout=10000` for the integration suite.
                    testTimeout: 10000
                }
            },
            {
                test: {
                    ...sharedDbConfig,
                    name: 'legacy',
                    // isolate:true for the same reason as integration: the legacy
                    // suite is the most state-pollution-prone (it was parked on
                    // exactly that under the old serial model), so per-file
                    // isolation removes the inter-file bleed by construction.
                    isolate: true,
                    include: ['test/legacy/**/*.test.{js,ts}'],
                    exclude: ['**/node_modules/**'],
                    // Matches the mocha `--timeout=60000` (boot-heavy model/api/site tests).
                    testTimeout: 60000
                }
            },
            {
                test: {
                    ...sharedDbConfig,
                    name: 'e2e-api',
                    // isolate:true like integration/legacy: this large (~97-file)
                    // snapshot-heavy suite is state-pollution-prone, so per-file
                    // isolation removes the inter-file bleed by construction.
                    isolate: true,
                    include: ['test/e2e-api/**/*.test.{js,ts}'],
                    exclude: ['**/node_modules/**'],
                    // Matches the mocha `--timeout=15000` for the e2e suites.
                    testTimeout: 15000
                }
            }
        ]
    }
});
