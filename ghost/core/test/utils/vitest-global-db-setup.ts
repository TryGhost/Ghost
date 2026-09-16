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
const knex = require('knex');

// Reject vitest's own NODE_ENV='test' default (Ghost has no config.test.json);
// use the MySQL test environment. Mirrors vitest-setup-db.ts so the template is
// built under the same environment the forks run under.
process.env.NODE_ENV = 'testing-mysql';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

const portBlockSize = 128;
// Keep every worker port four digits long, matching the canonical snapshot port
// (2369). Response bodies normalize dynamic URLs before comparison, but their
// content-length headers are calculated first and therefore depend on port width.
const portBlockCount = 54;
const firstPortBlock = 3000;

const reservePortBlock = async (runId: string) => {
  const config = require('../../core/shared/config');
  const connectionConfig = { ...config.get('database:connection') };
  delete connectionConfig.database;
  const admin = knex({
    client: config.get('database:client'),
    connection: connectionConfig,
  });
  const connection = await admin.client.acquireConnection().catch(async (err: unknown) => {
    await admin.destroy();
    throw err;
  });
  const firstCandidate = parseInt(runId, 16) % portBlockCount;
  const closeAdmin = async () => {
    try {
      await admin.client.releaseConnection(connection);
    } catch {
      // Closing the pool below also releases its MySQL advisory locks.
    }
    try {
      await admin.destroy();
    } catch {
      // Best effort during setup/teardown cleanup.
    }
  };

  try {
    for (let offset = 0; offset < portBlockCount; offset += 1) {
      const block = (firstCandidate + offset) % portBlockCount;
      const lockName = `ghost-test-port-block-${block}`;
      const [rows] = await admin
        .raw('SELECT GET_LOCK(?, 0) AS acquired', [lockName])
        .connection(connection);

      if (rows[0].acquired === 1) {
        return {
          portBase: firstPortBlock + block * portBlockSize,
          release: async () => {
            try {
              await admin.raw('SELECT RELEASE_LOCK(?)', [lockName]).connection(connection);
            } catch {
              // Closing the connection also releases its advisory locks.
            }
            await closeAdmin();
          },
        };
      }
    }
  } catch (err) {
    await closeAdmin();
    throw err;
  }

  await closeAdmin();
  throw new Error('No MySQL test port block is available');
};

export default async function setup() {
  // The run's BASE (un-suffixed) DB identifier. In this main process the base
  // env vars carry no per-fork session suffix, so deriving template locations
  // from them yields exactly the values the forks compute from their suffixed
  // config. Captured before loading config so it reflects the true base.
  const runId = crypto.randomBytes(4).toString('hex');
  const run = {
    mysqlBase: process.env.database__connection__database || 'ghost_testing',
    runId,
  };

  // Load Ghost's runtime overrides (nconf wiring) and the template builder.
  require('../../core/server/overrides');
  const { buildTemplate, dropRunDatabases } = require('./db-template');
  const portBlock = await reservePortBlock(runId);

  process.env.GHOST_TEST_DB_BASE = run.mysqlBase;
  process.env.GHOST_TEST_DB_RUN_ID = run.runId;
  process.env.GHOST_TEST_PORT_BASE = String(portBlock.portBase);
  process.env.GHOST_TEST_PORT_BLOCK_SIZE = String(portBlockSize);

  try {
    await buildTemplate(run);
  } catch (err) {
    try {
      await dropRunDatabases(run);
    } finally {
      await portBlock.release();
    }
    throw err;
  }

  // Teardown: drop the template and every worker database once all forks have
  // exited. Best effort.
  return async () => {
    try {
      await dropRunDatabases(run);
    } finally {
      await portBlock.release();
    }
  };
}
