// Vitest globalSetup for the DB-backed suites — runs ONCE in the main process
// before any worker fork is spawned (and a teardown once after they all exit).
//
// It builds the run's migrated + seeded "template" database once; each fork then
// RESTORES from it when it first provisions its per-process DB (see
// test/utils/db-utils.js) instead of running a full migrate+seed per file. That
// per-file init is the dominant cost of the acceptance-test runtime regression.
// MySQL restores from a same-server template via
// a bulk table copy; sqlite ATTACHes the template file and bulk-copies it onto
// the fork's own connection (never copying the file over an open connection — a
// previously-reverted approach). Both keep the restore byte-faithful to a fresh
// init.
//
// The fork learns the template is ready via an inherited env var — env set here,
// before the forks spawn, is inherited by them. We point the DB config at the
// template location while building; the forks derive the same location from
// their own (session-suffixed) config value via the shared pure helpers in
// db-template-paths.js.

// Register tsx's CommonJS hook so requiring Ghost's .ts sources works here too
// (mirrors vitest-setup-db.ts). Must run before any Ghost source is required.
require('tsx/cjs');

// Reject vitest's own NODE_ENV='test' default (Ghost has no config.test.json);
// keep any `testing*` value (CI uses `testing-mysql`), else default to `testing`.
// Mirrors vitest-setup-db.ts so the templates are built under the same env the
// forks will run under.
process.env.NODE_ENV = process.env.NODE_ENV?.startsWith('testing') ? process.env.NODE_ENV : 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

export default async function setup() {
    // The run's BASE (un-suffixed) DB identifier. In this main process the base
    // env vars carry no per-fork session suffix, so deriving template locations
    // from them yields exactly the values the forks compute from their suffixed
    // config. Captured before loading config so it reflects the true base.
    const base = {
        sqliteBase: process.env.database__connection__filename || '/tmp/ghost-test.db',
        mysqlBase: process.env.database__connection__database || 'ghost_testing'
    };

    // Load Ghost's runtime overrides (nconf wiring) and the template builder.
    require('../../core/server/overrides');
    const {buildTemplate, dropTemplate} = require('./db-template');

    await buildTemplate(base);

    // Teardown: drop the template once all forks have exited. Best effort.
    return async () => {
        await dropTemplate(base);
    };
}
