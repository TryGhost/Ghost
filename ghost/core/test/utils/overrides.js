const crypto = require('crypto');

process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Generate unique session values for database and port BEFORE loading Ghost,
// so that nconf picks them up naturally via nconf.env(). Worker threads
// spawned by bree also inherit these env vars and get the same values when
// they load a fresh nconf instance. Values already set externally (e.g. by
// CI or the user) are respected.
const sessionId = crypto.randomBytes(4).toString('hex');
const sqliteGenerated = !process.env.database__connection__filename;
const mysqlGenerated = !process.env.database__connection__database;
process.env.database__connection__filename = process.env.database__connection__filename || `/tmp/ghost-test-${sessionId}.db`;
process.env.database__connection__database = process.env.database__connection__database || `ghost_testing_${sessionId}`;

const canonicalTestPort = 2369;
process.env.server__port = process.env.server__port || String(2370 + Math.floor(Math.random() * 7630));
process.env.url = process.env.url || `http://127.0.0.1:${process.env.server__port}`;
const sessionPort = parseInt(process.env.server__port, 10);

// Now load Ghost — config will read the env vars we just set
require('../../core/server/overrides');

const snapshotExports = require('@tryghost/express-test').snapshot;
const {mochaHooks} = snapshotExports;

// Monkey-patch the snapshot manager to normalize URLs before comparison.
// When a random port is in use, response URLs contain the session port but
// committed snapshots use the canonical port (2369). This normalization
// ensures snapshot comparisons remain stable across concurrent sessions.
if (sessionPort !== canonicalTestPort && snapshotExports.snapshotManager) {
    const snapshotManager = snapshotExports.snapshotManager;
    const originalMatch = snapshotManager.match.bind(snapshotManager);
    const portRegex = new RegExp(`127\\.0\\.0\\.1:${sessionPort}`, 'g');

    // Deep-replace port strings in plain objects/arrays, leaving matcher
    // instances (AsymmetricMatcher, RegExp, etc.) untouched.
    const normalizePort = (obj) => {
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
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = normalizePort(obj[key]);
        }
        return result;
    };

    snapshotManager.match = function (received, properties, hint) {
        const normalized = JSON.parse(
            JSON.stringify(received).replace(portRegex, `127.0.0.1:${canonicalTestPort}`)
        );
        return originalMatch(normalized, normalizePort(properties), hint);
    };
}

exports.mochaHooks = mochaHooks;

const chalk = require('chalk');
const mockManager = require('./e2e-framework-mock-manager');

const originalBeforeAll = mochaHooks.beforeAll;
mochaHooks.beforeAll = async function () {
    if (originalBeforeAll) {
        await originalBeforeAll();
    }

    // Disable network in tests to prevent any accidental requests
    mockManager.disableNetwork();
};

const originalAfterEach = mochaHooks.afterEach;
mochaHooks.afterEach = async function () {
    const domainEvents = require('@tryghost/domain-events');
    const mentionsJobsService = require('../../core/server/services/mentions-jobs');
    const jobsService = require('../../core/server/services/jobs');

    let timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error(chalk.yellow('\n[SLOW TEST] It takes longer than 2s to wait for all jobs and events to settle in the afterEach hook\n'));
    }, 2000);

    await domainEvents.allSettled();
    await mentionsJobsService.allSettled();
    await jobsService.allSettled();

    // Last time for events emitted during jobs
    await domainEvents.allSettled();

    clearTimeout(timeout);

    if (originalAfterEach) {
        await originalAfterEach();
    }
};

const originalAfterAll = mochaHooks.afterAll;
mochaHooks.afterAll = async function () {
    if (originalAfterAll) {
        await originalAfterAll();
    }

    // Clean up the session-specific test database (only if we generated it)
    if (process.env.NODE_ENV === 'testing-mysql') {
        try {
            const db = require('../../core/server/data/db');
            if (mysqlGenerated) {
                await db.knex.raw(`DROP DATABASE IF EXISTS \`${process.env.database__connection__database}\``);
            }
            await db.knex.destroy();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to clean up test database:', err.message);
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
        } catch (err) {
            // Best effort cleanup
        }
    }
};
