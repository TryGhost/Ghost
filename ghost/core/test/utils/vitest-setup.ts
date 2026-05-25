// Vitest setup — mirrors the behavior of ./overrides.js (used by mocha
// via --require) for tests that run under vitest. As buckets migrate
// from mocha to vitest, this file's responsibility grows; for now it's
// scoped to what the unit-test spike subtree needs plus the snapshot
// hook bridge from @tryghost/express-test so it's exercised end-to-end.

// The ghost/mocha lint plugin flags top-level beforeAll/afterEach/afterAll
// calls — those rules guard against accidental top-level hooks in mocha
// test files, but vitest setup files are *meant* to register global hooks
// at the top level. Disable for this file only.
/* eslint-disable ghost/mocha/no-top-level-hooks, ghost/mocha/no-sibling-hooks, ghost/mocha/handle-done-callback */

import crypto from 'node:crypto';
import chalk from 'chalk';
import {beforeAll, beforeEach, afterEach, afterAll} from 'vitest';

// Register tsx's CommonJS hook so test files (and the Ghost server code they
// pull in) can require() .ts sources. Scoping it here — rather than a global
// NODE_OPTIONS='--import tsx' — keeps the loader out of the sibling app
// projects under the unified `pnpm test:watch`, where it breaks their module
// resolution. Must run before any Ghost source is required below.
require('tsx/cjs');

process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Generate unique session values for the database and port BEFORE loading
// Ghost. The setup file re-runs per test file, but `process.env` is shared
// across the files in a worker, so the first file to run fixes the session
// and every later file in that worker reuses it — one db/port per worker.
// Values already set externally (CI, user shell) are always respected.
const sessionId = crypto.randomBytes(4).toString('hex');
process.env.database__connection__filename =
    process.env.database__connection__filename || `/tmp/ghost-test-${sessionId}.db`;
process.env.database__connection__database =
    process.env.database__connection__database || `ghost_testing_${sessionId}`;

const canonicalTestPort = 2369;
process.env.server__port =
    process.env.server__port || String(2370 + Math.floor(Math.random() * 7630));
process.env.url = process.env.url || `http://127.0.0.1:${process.env.server__port}`;
const sessionPort = parseInt(process.env.server__port, 10);

// Load Ghost's runtime overrides (nconf wiring, etc.) — must happen
// after the env vars above are set.
require('../../core/server/overrides');

const snapshotExports = require('@tryghost/express-test').snapshot;
const {mochaHooks} = snapshotExports;

// Monkey-patch the snapshot manager to normalize URLs before comparison.
// When a random port is in use, response URLs contain the session port
// but committed snapshots use the canonical port (2369). Without this,
// every snapshot diff would contain a port mismatch.
if (sessionPort !== canonicalTestPort && snapshotExports.snapshotManager) {
    const snapshotManager = snapshotExports.snapshotManager;
    const originalMatch = snapshotManager.match.bind(snapshotManager);
    const portRegex = new RegExp(`127\\.0\\.0\\.1:${sessionPort}`, 'g');

    const normalizePort = (obj: unknown): unknown => {
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
            return obj;
        }
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj as Record<string, unknown>)) {
            result[key] = normalizePort((obj as Record<string, unknown>)[key]);
        }
        return result;
    };

    snapshotManager.match = function (received: unknown, properties: unknown, hint: unknown) {
        const normalized = JSON.parse(
            JSON.stringify(received).replace(portRegex, `127.0.0.1:${canonicalTestPort}`)
        );
        return originalMatch(normalized, normalizePort(properties), hint);
    };
}

// e2e-framework-mock-manager is pulled in lazily — it boots a fair
// amount of Ghost-side machinery, which unit tests in the spike subtree
// don't need. Only require it when a hook actually runs.
let mockManager: {disableNetwork: () => void} | undefined;
const getMockManager = () => {
    if (!mockManager) {
        mockManager = require('./e2e-framework-mock-manager');
    }
    return mockManager!;
};

// Bridge @tryghost/express-test's mochaHooks contract onto vitest's
// globals. The hooks are plain async functions so they translate
// directly. Order matches overrides.js for parity.
beforeAll(async () => {
    if (mochaHooks?.beforeAll) {
        await mochaHooks.beforeAll();
    }
    getMockManager().disableNetwork();
});

// Bridge jest-snapshot's per-test config. The mocha hook reads
// `this.currentTest`; vitest has no mocha `this`, so we derive the same
// testPath/testTitle from the vitest task. testTitle must exactly match
// mocha's `fullTitle()` (describe names + test name joined by spaces) or
// committed .snap keys won't resolve.
beforeEach((context: {task: {name: string; suite?: unknown; file?: {filepath?: string}}}) => {
    const snapshotManager = snapshotExports.snapshotManager;
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
    await domainEvents.allSettled();

    clearTimeout(timeout);

    try {
        if (mochaHooks?.afterEach) {
            await mochaHooks.afterEach();
        }
    } finally {
        // Individual test afterEach hooks often call sinon.restore() which
        // strips the DNS stubs set in beforeAll; reapply so subsequent
        // tests don't hit real DNS on nocked domains.
        getMockManager().disableNetwork();
    }
});

afterAll(async () => {
    if (mochaHooks?.afterAll) {
        await mochaHooks.afterAll();
    }

    // The unit suite runs with `isolate: false`, so the knex pool is shared
    // by every test file in a worker — it must NOT be destroyed here, or the
    // files scheduled after this one lose their connection. Instead, wait for
    // in-flight queries to drain so no sqlite3 callback can fire after the
    // worker thread is terminated (the FATAL napi crash the threads pool is
    // prone to). The pool is left for the worker to tear down on exit; the
    // session sqlite files are removed once per run by vitest-global-setup.
    try {
        const pool = require('../../core/server/data/db').knex?.client?.pool;
        const deadline = Date.now() + 5000;
        while (pool && pool.numUsed() > 0 && Date.now() < deadline) {
            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });
        }
    } catch {
        // best effort — the db may never have been connected in this worker
    }
});
