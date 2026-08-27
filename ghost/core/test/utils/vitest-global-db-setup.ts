// Vitest globalSetup for the DB-backed suites — runs ONCE in the main process
// before any worker fork is spawned (and a teardown once after they all exit).
//
// It builds the run's migrated + seeded "template" database once; each fork then
// RESTORES from it when it first provisions its per-process DB (see
// test/utils/db-utils.js) instead of running a full migrate+seed per file. That
// per-file init is the dominant cost of the acceptance-test runtime regression.
// MySQL restores from a same-server template via a bulk table copy that keeps
// the restore byte-faithful to a fresh init.
//
// The forks inherit a run ID and base database name set here before they spawn.
// Those values give every worker a unique, discoverable database name so global
// teardown can remove all schemas created by this run.

// Register tsx's CommonJS hook so requiring Ghost's .ts sources works here too
// (mirrors vitest-setup-db.ts). Must run before any Ghost source is required.
require('tsx/cjs');
const crypto = require('crypto');

// Reject vitest's own NODE_ENV='test' default (Ghost has no config.test.json);
// use the MySQL test environment. Mirrors vitest-setup-db.ts so the template is
// built under the same environment the forks run under.
process.env.NODE_ENV = 'testing-mysql';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

export default async function setup() {
  // The run's BASE (un-suffixed) DB identifier. In this main process the base
  // env vars carry no per-fork session suffix, so deriving template locations
  // from them yields exactly the values the forks compute from their suffixed
  // config. Captured before loading config so it reflects the true base.
  const run = {
    mysqlBase: process.env.database__connection__database || 'ghost_testing',
    runId: crypto.randomBytes(4).toString('hex'),
  };
  process.env.GHOST_TEST_DB_BASE = run.mysqlBase;
  process.env.GHOST_TEST_DB_RUN_ID = run.runId;

  // Load Ghost's runtime overrides (nconf wiring) and the template builder.
  require('../../core/server/overrides');
  const { buildTemplate, dropRunDatabases } = require('./db-template');

  await buildTemplate(run);

  // Teardown: drop the template and every worker database once all forks have
  // exited. Best effort.
  return async () => {
    await dropRunDatabases(run);
  };
}
