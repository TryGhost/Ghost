const crypto = require('crypto');
const Module = require('module');
const path = require('path');

let state;
let aliasesInstalled = false;

function installWorkspaceAliases() {
    if (aliasesInstalled) {
        return;
    }

    const originalResolveFilename = Module._resolveFilename;
    const parseEmailAddressSource = path.resolve(__dirname, '../../../parse-email-address/src/index.ts');

    Module._resolveFilename = function (request, parent, isMain, options) {
        if (request === '@tryghost/parse-email-address') {
            return parseEmailAddressSource;
        }

        return originalResolveFilename.call(this, request, parent, isMain, options);
    };

    aliasesInstalled = true;
}

function initTestEnvVars() {
    process.env.NODE_ENV = !process.env.NODE_ENV || process.env.NODE_ENV === 'test' ? 'testing' : process.env.NODE_ENV;
    process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

    const sessionId = crypto.randomBytes(4).toString('hex');
    const sqliteGenerated = process.env.GHOST_TEST_SQLITE_GENERATED ?
        process.env.GHOST_TEST_SQLITE_GENERATED === 'true' :
        !process.env.database__connection__filename;
    const mysqlGenerated = process.env.GHOST_TEST_MYSQL_GENERATED ?
        process.env.GHOST_TEST_MYSQL_GENERATED === 'true' :
        !process.env.database__connection__database;

    process.env.GHOST_TEST_SQLITE_GENERATED = String(sqliteGenerated);
    process.env.GHOST_TEST_MYSQL_GENERATED = String(mysqlGenerated);
    process.env.database__connection__filename = process.env.database__connection__filename || `/tmp/ghost-test-${sessionId}.db`;
    process.env.database__connection__database = process.env.database__connection__database || `ghost_testing_${sessionId}`;

    const canonicalTestPort = 2369;
    process.env.server__port = process.env.server__port || String(2370 + Math.floor(Math.random() * 7630));
    process.env.url = process.env.url || `http://127.0.0.1:${process.env.server__port}`;
    const sessionPort = parseInt(process.env.server__port, 10);

    return {
        canonicalTestPort,
        mysqlGenerated,
        sessionPort,
        sqliteGenerated
    };
}

function setupTestEnv() {
    if (state) {
        return state;
    }

    const {
        canonicalTestPort,
        mysqlGenerated,
        sessionPort,
        sqliteGenerated
    } = initTestEnvVars();

    installWorkspaceAliases();

    require('../../core/server/overrides');

    const snapshotExports = require('@tryghost/express-test').snapshot;

    if (sessionPort !== canonicalTestPort && snapshotExports.snapshotManager) {
        const snapshotManager = snapshotExports.snapshotManager;
        const originalMatch = snapshotManager.match.bind(snapshotManager);
        const portRegex = new RegExp(`127\\.0\\.0\\.1:${sessionPort}`, 'g');

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
                return obj;
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

    state = {
        mysqlGenerated,
        snapshotExports,
        sqliteGenerated
    };

    return state;
}

async function settleJobs() {
    const chalk = require('chalk');
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
    await domainEvents.allSettled();

    clearTimeout(timeout);
}

function disableNetwork() {
    const mockManager = require('./e2e-framework-mock-manager');
    mockManager.disableNetwork();
}

async function cleanupDatabases() {
    if (process.env.NODE_ENV === 'testing-mysql') {
        try {
            const db = require('../../core/server/data/db');
            if (process.env.GHOST_TEST_MYSQL_GENERATED === 'true') {
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
            if (process.env.GHOST_TEST_SQLITE_GENERATED === 'true') {
                const dbFile = process.env.database__connection__filename;
                await fs.remove(dbFile);
                await fs.remove(`${dbFile}-orig`);
                await fs.remove(`${dbFile}-journal`);
            }
        } catch (err) {
            // Best effort cleanup
        }
    }
}

module.exports = {
    cleanupDatabases,
    disableNetwork,
    initTestEnvVars,
    installWorkspaceAliases,
    setupTestEnv,
    settleJobs
};
