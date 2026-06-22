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
// the DB suites run fork-parallel (PLA-156). The per-fork sessionId is appended
// even to a CI-pinned *base*: the sqlite leg exports a single
// database__connection__filename=/dev/shm/ghost-test.db for the whole job, so
// without a unique suffix every fork would hammer the same file. (The mysql leg
// pins only host/port, so the database name is generated outright here.)
//
// sqlite names are keyed on VITEST_POOL_ID (1..poolSize, like the port below) so
// a run reuses ~poolSize stable files instead of leaving a fresh random DB in
// /tmp every run — that bounded reuse is what stops local /tmp accumulation.
// A reused file still holds the prior fork's data, though, and Ghost reads it at
// boot (settings cache, url service) before the suite resets — which corrupts
// whichever file lands on the slot (null Owner, stale URLs, bad export). So the
// file is deleted just below, before Ghost loads, so a reused slot boots from
// nothing exactly as a fresh name would. mysql keeps a random per-fork name: it
// has no /tmp to bound (CI databases die with the job) and a random name sidesteps
// the same stale-reuse hazard without a pre-boot DROP. (PLA-168)
const poolSlot = parseInt(process.env.VITEST_POOL_ID || '', 10);
const sqliteId = Number.isInteger(poolSlot)
    ? `pool_${poolSlot}`
    : crypto.randomBytes(4).toString('hex');
const sqliteBase = process.env.database__connection__filename;
process.env.database__connection__filename = sqliteBase
    ? `${sqliteBase.replace(/\.db$/i, '')}-${sqliteId}.db`
    : `/tmp/ghost-test-${sqliteId}.db`;
const mysqlId = crypto.randomBytes(4).toString('hex');
const mysqlBase = process.env.database__connection__database;
process.env.database__connection__database = mysqlBase
    ? `${mysqlBase}_${mysqlId}`
    : `ghost_testing_${mysqlId}`;

// Delete this slot's leftover sqlite file (+ sidecars) before Ghost loads, so a
// reused pool name boots from a clean slate — see the note above. SQLITE LEG ONLY:
// on the mysql leg (NODE_ENV testing-mysql) this derived filename is never ours —
// it belongs to a concurrent sqlite run on the same machine, and deleting it out
// from under that run destroys its database mid-write (SQLITE_READONLY). force:true
// makes the sqlite delete a no-op on a slot's first use.
if (!process.env.NODE_ENV.includes('mysql')) {
    for (const suffix of ['', '-journal', '-wal', '-shm', '-orig']) {
        try {
            require('fs').rmSync(process.env.database__connection__filename + suffix, {force: true});
        } catch (e) {
            // best effort — a fresh boot recreates it
        }
    }
}

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

// NOTE: each fork still leaves a DB behind — vitest force-terminates forks (which
// is also why the forks-teardown deadlock doesn't bite), so a process 'exit'
// handler can't reclaim them. sqlite stays bounded: the next fork on a slot
// deletes the file at boot (see the derivation above) and recreates it, so a run
// reuses at most ~poolSize files in /tmp instead of leaving a fresh random one
// behind every run. mysql names are random per fork but ephemeral on CI (the
// container dies with the job); locally the mysql suite is rarely run. (PLA-168)

const canonicalTestPort = 2369;
// The per-fork port must be unique among forks running concurrently. Each test
// file boots a real HTTP server on this port (e2e-api tests hit it via
// supertest.agent(config.get('url'))); if two concurrent forks land on the same
// port, one Ghost ends up serving the other's requests — or boots unready — and
// every request 404s with an HTML body (e.g. the whole invites suite failing
// intermittently). vitest gives each concurrent fork a distinct VITEST_POOL_ID
// (1..poolSize); a recycled slot's port is reused only after its previous fork
// has exited and freed it, so base+poolId never collides among live forks. The
// old `Math.random()` port in a 7630-wide range collided often enough across ~90
// parallel boots to flake. (The DB name already uses a 2^32 sessionId, which is
// collision-resistant; only the port was under-spread.) (PLA-153)
const poolId = parseInt(process.env.VITEST_POOL_ID || '', 10);
const derivedPort = Number.isInteger(poolId)
    ? 2370 + poolId
    : 2370 + Math.floor(Math.random() * 7630);
process.env.server__port = process.env.server__port || String(derivedPort);
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
