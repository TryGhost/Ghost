process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

require('../../core/server/overrides');

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
