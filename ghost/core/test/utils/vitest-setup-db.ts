// Vitest setup for the DB-backed suites (integration / e2e / legacy).
//
// These suites boot a real Ghost server against a provisioned database — unlike
// the unit suite (./vitest-setup.ts), which never touches a DB. This file is the
// vitest equivalent of ./overrides.js (the mocha `--require`): it derives a
// per-session database + port BEFORE Ghost's config loads, loads Ghost's
// runtime overrides, and bridges @tryghost/express-test's mochaHooks contract
// onto vitest's globals.
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

// vitest setup files are *meant* to register top-level hooks; the ghost/mocha
// lint plugin (aimed at mocha test files) flags them. Disable for this file.
/* eslint-disable ghost/mocha/no-top-level-hooks, ghost/mocha/no-sibling-hooks, ghost/mocha/handle-done-callback */

import {beforeAll, beforeEach, afterEach, afterAll} from 'vitest';

const crypto = require('crypto');
const chalk = require('chalk');

// Register tsx's CommonJS hook so test files (and the Ghost server code they
// pull in) can require() .ts sources. Scoped here rather than a global
// NODE_OPTIONS='--import tsx' — see ./vitest-setup.ts for the rationale. Must
// run before any Ghost source is required below.
require('tsx/cjs');

// Reject vitest's own `NODE_ENV='test'` default (Ghost has no config.test.json);
// keep any `testing*` value (CI uses `testing-mysql`), else default to `testing`.
process.env.NODE_ENV = process.env.NODE_ENV?.startsWith('testing') ? process.env.NODE_ENV : 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Generate unique session values for database and port BEFORE loading Ghost, so
// nconf picks them up naturally via nconf.env(). Worker threads spawned by bree
// inherit these env vars and get the same values when they load a fresh nconf
// instance.
//
// Each worker is its own process, so it gets its own database — that's what lets
// the DB suites run fork-parallel (PLA-156). The per-process sessionId is
// appended even to a CI-pinned *base*: the sqlite leg exports a single
// database__connection__filename=/dev/shm/ghost-test.db for the whole job, so
// without a unique suffix every fork would hammer the same file. (The mysql leg
// pins only host/port, so the database name is generated outright here.)
const sessionId = crypto.randomBytes(4).toString('hex');
const sqliteBase = process.env.database__connection__filename;
process.env.database__connection__filename = sqliteBase
    ? `${sqliteBase.replace(/\.db$/i, '')}-${sessionId}.db`
    : `/tmp/ghost-test-${sessionId}.db`;
const mysqlBase = process.env.database__connection__database;
process.env.database__connection__database = mysqlBase
    ? `${mysqlBase}_${sessionId}`
    : `ghost_testing_${sessionId}`;

// Flush this worker's V8 coverage after every file. The external c8 collector
// reads NODE_V8_COVERAGE, which Node writes only on a clean process exit — but
// vitest force-terminates the forks (the same reason the forks-teardown deadlock
// doesn't bite). Under isolate:true each file runs in its own short-lived fork
// that's recycled mid-run, so most never reach that flush and their coverage is
// lost (a SIGTERM handler is unreliable: recycled forks don't all get one).
// Running v8.takeCoverage() in this per-file afterAll writes each file's coverage
// to disk before its fork is torn down, so c8 captures every file. No-op off
// coverage runs. (PLA-156)
if (process.env.NODE_V8_COVERAGE) {
    afterAll(() => {
        try {
            require('v8').takeCoverage();
        } catch (e) {
            // best effort
        }
    });
}

// NOTE: each fork leaves its per-process DB behind (sqlite file / mysql db).
// vitest force-terminates forks (which is also why the forks-teardown deadlock
// doesn't bite), so a process 'exit' handler can't reclaim them. On CI both are
// ephemeral (the runner's /dev/shm and the mysql container die with the job);
// locally they accumulate under /tmp. Proper reclamation (a globalSetup teardown
// that sweeps the run's DBs) is tracked in PLA-156.

const canonicalTestPort = 2369;
process.env.server__port = process.env.server__port || String(2370 + Math.floor(Math.random() * 7630));
process.env.url = process.env.url || `http://127.0.0.1:${process.env.server__port}`;
const sessionPort = parseInt(process.env.server__port, 10);

// Load Ghost's runtime overrides (nconf wiring, etc.) — config now reads the env
// vars set above.
require('../../core/server/overrides');

const snapshotExports = require('@tryghost/express-test').snapshot;
const {snapshotManager, mochaHooks} = snapshotExports;

// Normalize URLs before snapshot comparison. When a random port is in use,
// response URLs contain the session port but committed snapshots use the
// canonical port (2369). Keeps snapshot comparisons stable across sessions.
// Mirrors ./overrides.js.
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
            JSON.stringify(received).replace(portRegex, `127.0.0.1:${canonicalTestPort}`)
        );
        return originalMatch(normalized, normalizePort(properties), hint);
    };
}

const mockManager = require('./e2e-framework-mock-manager');

// Bridge @tryghost/express-test's mochaHooks contract onto vitest's globals.
// Order matches ./overrides.js for parity.
//
// NOTE: vitest runs setup-file hooks per *file*, not once per run like mocha's
// root hooks. That's fine for these (disableNetwork is idempotent; the snapshot
// hooks are per-file aware). DB teardown (drop database / remove the sqlite
// file) is deliberately NOT done here for that reason — it would run after every
// file and tear the shared connection down mid-run. The worker is terminated at
// the end of the run instead; the per-session sqlite file lives in /tmp.
beforeAll(async () => {
    if (mochaHooks?.beforeAll) {
        await mochaHooks.beforeAll();
    }
    mockManager.disableNetwork();
});

// Bridge jest-snapshot's per-test config. The mocha hook reads
// `this.currentTest`; vitest has no mocha `this`, so derive the same
// testPath/testTitle from the vitest task. testTitle must exactly match mocha's
// `fullTitle()` (describe names + test name joined by spaces) or committed .snap
// keys won't resolve. Mirrors ./vitest-setup.ts.
beforeEach((context: {task: {name: string; suite?: unknown; file?: {filepath?: string}}}) => {
    if (!snapshotManager) {
        return;
    }
    const titleParts: string[] = [];
    let node: {name?: string; suite?: unknown; filepath?: string} | undefined = context.task;
    // Walk task -> describe(s); stop at the file node (it has `filepath`).
    while (node && !node.filepath) {
        if (node.name) {
            titleParts.unshift(node.name);
        }
        node = node.suite as typeof node;
    }
    snapshotManager.setCurrentTest({
        testPath: context.task.file?.filepath,
        testTitle: titleParts.join(' ')
    });
});

afterEach(async () => {
    const domainEvents = require('@tryghost/domain-events');
    const mentionsJobsService = require('../../core/server/services/mentions-jobs');
    const jobsService = require('../../core/server/services/jobs');

    const timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error(chalk.yellow(
            '\n[SLOW TEST] It takes longer than 2s to wait for all jobs ' +
            'and events to settle in the afterEach hook\n'
        ));
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
        // don't hit real DNS on nocked domains.
        mockManager.disableNetwork();
    }
});

afterAll(async () => {
    if (mochaHooks?.afterAll) {
        await mochaHooks.afterAll();
    }
});
