const crypto = require('crypto');

process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

require('../../core/server/overrides');

// Generate a unique database name per test session to allow concurrent test runs.
// Uses nconf-style env vars (database__connection__*) so worker threads spawned by
// bree inherit the config when they load a fresh nconf instance.
const sessionId = crypto.randomBytes(4).toString('hex');
const config = require('../../core/shared/config');
let sessionDbName;
let sessionDbIsGenerated = false;

if (process.env.NODE_ENV === 'testing-mysql') {
    if (process.env.database__connection__database) {
        sessionDbName = process.env.database__connection__database;
    } else {
        sessionDbName = `ghost_testing_${sessionId}`;
        sessionDbIsGenerated = true;
    }
    process.env.database__connection__database = sessionDbName;
    config.set('database:connection:database', sessionDbName);
} else {
    if (process.env.database__connection__filename) {
        sessionDbName = process.env.database__connection__filename;
    } else {
        sessionDbName = `/tmp/ghost-test-${sessionId}.db`;
        sessionDbIsGenerated = true;
    }
    process.env.database__connection__filename = sessionDbName;
    config.set('database:connection:filename', sessionDbName);
}

const {mochaHooks} = require('@tryghost/express-test').snapshot;
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
            if (sessionDbIsGenerated && sessionDbName) {
                await db.knex.raw(`DROP DATABASE IF EXISTS \`${sessionDbName}\``);
            }
            await db.knex.destroy();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to clean up test database:', err.message);
        }
    } else {
        try {
            const fs = require('fs-extra');
            if (sessionDbIsGenerated && sessionDbName) {
                await fs.remove(sessionDbName);
                await fs.remove(`${sessionDbName}-orig`);
                await fs.remove(`${sessionDbName}-journal`);
            }
        } catch (err) {
            // Best effort cleanup
        }
    }
};
