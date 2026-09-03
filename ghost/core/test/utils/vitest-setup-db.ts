// Vitest setup for the DB-backed suites (integration / e2e / legacy).
//
// These suites boot a real Ghost server against a provisioned database — unlike
// the unit suite (./vitest-setup.ts), which never touches a DB. This file
// derives a per-session database + port BEFORE Ghost's config loads, loads
// Ghost's runtime overrides, and bridges @tryghost/express-test's mochaHooks
// contract onto vitest's globals.
//
// Execution model: one Ghost server == one process (Ghost's db/knex,
// @tryghost/domain-events, the jobs manager, nconf, settings cache, and the url
// service are all module-level singletons that are reset in place between boots,
// never duplicated). The DB suites therefore run in a single non-isolated worker
// — `isolate: false` so the module registry (and the booted server) is shared
// across files, exactly as mocha ran them. The per-session db/port derivation
// below is still done per worker so multiple concurrent runs (or a future
// forks-based parallel model, where each fork is its own process with its own
// DB) never collide.

import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

const crypto = require('crypto');
const chalk = require('chalk');

// Register tsx's CommonJS hook so test files (and the Ghost server code they
// pull in) can require() .ts sources. Scoped here rather than a global
// NODE_OPTIONS='--import tsx' — see ./vitest-setup.ts for the rationale. Must
// run before any Ghost source is required below.
require('tsx/cjs');

// DB-backed suites run against MySQL. Reject vitest's own `NODE_ENV='test'`
// default (Ghost has no config.test.json) by setting the MySQL test environment
// before config loads.
process.env.NODE_ENV = 'testing-mysql';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Generate unique session values for database and port BEFORE loading Ghost, so
// nconf picks them up naturally via nconf.env(). Worker threads spawned by bree
// inherit these env vars and get the same values when they load a fresh nconf
// instance.
//
// Each worker gets its own random database under the run prefix established by
// globalSetup. The prefix lets global teardown discover and remove every schema
// after the workers exit, including locally where the MySQL volume persists.
const mysqlBase = process.env.GHOST_TEST_DB_BASE;
const mysqlRunId = process.env.GHOST_TEST_DB_RUN_ID;
if (!mysqlBase || !mysqlRunId) {
  throw new Error('DB test setup requires vitest-global-db-setup.ts');
}
if (!process.env.GHOST_TEST_DB_WORKER_DATABASE) {
  const mysqlId = crypto.randomBytes(4).toString('hex');
  process.env.GHOST_TEST_DB_WORKER_DATABASE = `${mysqlBase}_${mysqlRunId}_${mysqlId}`;
}
process.env.database__connection__database = process.env.GHOST_TEST_DB_WORKER_DATABASE;

// Flush this worker's V8 coverage after every file. The external c8 collector
// reads NODE_V8_COVERAGE, which Node writes only on a clean process exit — but
// vitest force-terminates its workers (kill + SIGKILL for forks,
// worker.terminate() for threads), so that write never happens. Under
// isolate:true each file runs in its own short-lived worker that's recycled
// mid-run, so most never reach that flush and their coverage is lost (a SIGTERM
// handler is unreliable: recycled workers don't all get one, and a thread can't
// take signals at all). Running v8.takeCoverage() in this per-file afterAll
// writes each file's coverage to disk before its worker is torn down, so c8
// captures every file. No-op off coverage runs.
if (process.env.NODE_V8_COVERAGE) {
  afterAll(() => {
    try {
      require('v8').takeCoverage();
    } catch (e) {
      // best effort
    }
  });
}

const canonicalTestPort = 2369;
// The per-fork port must be unique among forks running concurrently. Each test
// file boots a real HTTP server on this port (e2e-api tests hit it via
// supertest.agent(config.get('url'))); if two concurrent forks land on the same
// port, one Ghost ends up serving the other's requests — or boots unready — and
// every request 404s with an HTML body (e.g. the whole invites suite failing
// intermittently). globalSetup reserves a run-scoped low-port block with a
// MySQL advisory lock, and vitest gives each concurrent fork a distinct
// VITEST_POOL_ID within that block. A recycled slot's port is reused only after
// its previous fork has exited and freed it.
const poolId = parseInt(process.env.VITEST_POOL_ID || '', 10);
const portBase = parseInt(process.env.GHOST_TEST_PORT_BASE || '', 10);
const portBlockSize = parseInt(process.env.GHOST_TEST_PORT_BLOCK_SIZE || '', 10);
if (!Number.isInteger(portBase) || !Number.isInteger(portBlockSize)) {
  throw new Error('DB test setup requires a reserved port block');
}
if (Number.isInteger(poolId) && (poolId < 1 || poolId >= portBlockSize)) {
  throw new Error(`VITEST_POOL_ID ${poolId} is outside the reserved port block`);
}
const derivedPort = portBase + (Number.isInteger(poolId) ? poolId : 0);
process.env.server__port = process.env.server__port || String(derivedPort);
process.env.url = process.env.url || `http://127.0.0.1:${process.env.server__port}`;
const sessionPort = parseInt(process.env.server__port, 10);

// Load Ghost's runtime overrides (nconf wiring, etc.) — config now reads the env
// vars set above.
require('../../core/server/overrides');

const snapshotExports = require('@tryghost/express-test').snapshot;
const { snapshotManager, mochaHooks } = snapshotExports;

// Normalize URLs before snapshot comparison. When a random port is in use,
// response URLs contain the session port but committed snapshots use the
// canonical port (2369). Keeps snapshot comparisons stable across sessions.
if (sessionPort !== canonicalTestPort && snapshotManager) {
  const originalMatch = snapshotManager.match.bind(snapshotManager);
  const portRegex = new RegExp(`127\\.0\\.0\\.1:${sessionPort}`, 'g');

  const normalizePort = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj === 'string') {
      return obj.replace(portRegex, `127.0.0.1:${canonicalTestPort}`);
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(normalizePort);
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      return obj; // matcher or special object — leave as-is
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = normalizePort(obj[key]);
    }
    return result;
  };

  snapshotManager.match = function (received: any, properties: any, hint: any) {
    const normalized = JSON.parse(
      JSON.stringify(received).replace(portRegex, `127.0.0.1:${canonicalTestPort}`),
    );
    return originalMatch(normalized, normalizePort(properties), hint);
  };
}

const mockManager = require('./e2e-framework-mock-manager');

// Bridge @tryghost/express-test's mochaHooks contract onto vitest's globals.
//
// NOTE: vitest runs setup-file hooks per *file*, not once per run like mocha's
// root hooks. That's fine for these (disableNetwork is idempotent; the snapshot
// hooks are per-file aware). DB teardown is deliberately NOT done here for that
// reason — it would run after every file and tear the shared connection down
// mid-run. The worker is terminated at the end of the run instead.
beforeAll(async () => {
  if (mochaHooks?.beforeAll) {
    await mochaHooks.beforeAll();
  }
  mockManager.disableNetwork();
  mockManager.mockWebmentionDiscoveryDomains();
});

// Bridge jest-snapshot's per-test config. The mocha hook reads
// `this.currentTest`; vitest has no mocha `this`, so derive the same
// testPath/testTitle from the vitest task. testTitle must exactly match mocha's
// `fullTitle()` (describe names + test name joined by spaces) or committed .snap
// keys won't resolve. Mirrors ./vitest-setup.ts.
beforeEach((context: { task: { name: string; suite?: unknown; file?: { filepath?: string } } }) => {
  if (!snapshotManager) {
    return;
  }
  const titleParts: string[] = [];
  let node: { name?: string; suite?: unknown; filepath?: string } | undefined = context.task;
  // Walk task -> describe(s); stop at the file node (it has `filepath`).
  while (node && !node.filepath) {
    if (node.name) {
      titleParts.unshift(node.name);
    }
    node = node.suite as typeof node;
  }
  snapshotManager.setCurrentTest({
    testPath: context.task.file?.filepath,
    testTitle: titleParts.join(' '),
  });
});

afterEach(async () => {
  const domainEvents = require('@tryghost/domain-events');
  const mentionsJobsService = require('../../core/server/services/mentions-jobs');
  const jobsService = require('../../core/server/services/jobs');

  const timeout = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error(
      chalk.yellow(
        '\n[SLOW TEST] It takes longer than 2s to wait for all jobs ' +
          'and events to settle in the afterEach hook\n',
      ),
    );
  }, 2000);

  await domainEvents.allSettled();
  await mentionsJobsService.allSettled();
  await jobsService.allSettled();
  // Last time for events emitted during jobs
  await domainEvents.allSettled();

  clearTimeout(timeout);

  try {
    if (mochaHooks?.afterEach) {
      await mochaHooks.afterEach();
    }
  } finally {
    // Individual test afterEach hooks often call sinon.restore() which
    // strips the DNS stubs set in beforeAll; reapply so subsequent tests
    // don't hit real DNS on nocked domains. Some test files also call
    // nock.cleanAll() directly (bypassing mockManager.restore()), which
    // would otherwise silently drop the webmention mocks for every test
    // that runs afterward in this worker.
    mockManager.disableNetwork();
    mockManager.mockWebmentionDiscoveryDomains();
  }
});

afterAll(async () => {
  if (mochaHooks?.afterAll) {
    await mochaHooks.afterAll();
  }
});
