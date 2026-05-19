// Vitest setup — mirrors the behavior of ./overrides.js (used by mocha
// via --require) for tests that run under vitest. As buckets migrate
// from mocha to vitest, this file's responsibility grows; for now it's
// scoped to what the unit-test spike subtree needs plus the snapshot
// hook bridge from @tryghost/express-test so it's exercised end-to-end.

// The ghost/mocha lint plugin flags top-level beforeAll/afterEach/afterAll
// calls — those rules guard against accidental top-level hooks in mocha
// test files, but vitest setup files are *meant* to register global hooks
// at the top level. Disable for this file only.
/* eslint-disable ghost/mocha/no-top-level-hooks, ghost/mocha/no-sibling-hooks */

import crypto from 'node:crypto';
import chalk from 'chalk';
import {beforeAll, afterEach, afterAll} from 'vitest';

process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Generate unique session values for database and port BEFORE loading
// Ghost. With pool=forks each test file is its own process, so each
// fork gets its own session — but values already set externally
// (CI, user shell) are respected.
const sessionId = crypto.randomBytes(4).toString('hex');
const sqliteGenerated = !process.env.database__connection__filename;
const mysqlGenerated = !process.env.database__connection__database;
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

    if (process.env.NODE_ENV === 'testing-mysql') {
        try {
            const db = require('../../core/server/data/db');
            if (mysqlGenerated) {
                await db.knex.raw(
                    `DROP DATABASE IF EXISTS \`${process.env.database__connection__database}\``
                );
            }
            await db.knex.destroy();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to clean up test database:', (err as Error).message);
        }
    } else {
        try {
            const fs = require('fs-extra');
            if (sqliteGenerated) {
                const dbFile = process.env.database__connection__filename;
                await fs.remove(dbFile);
                await fs.remove(`${dbFile}-orig`);
                await fs.remove(`${dbFile}-journal`);
            }
        } catch {
            // best effort
        }
    }
});
