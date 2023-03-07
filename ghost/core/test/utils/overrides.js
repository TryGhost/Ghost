process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

require('../../core/server/overrides');

const {mochaHooks} = require('@tryghost/express-test').snapshot;
exports.mochaHooks = mochaHooks;

const mockManager = require('./e2e-framework-mock-manager');

const originalBeforeAll = mochaHooks.beforeAll;
mochaHooks.beforeAll = async function () {
    if (originalBeforeAll) {
        await originalBeforeAll();
    }

    // Disable network in tests to prevent any accidental requests
    mockManager.disableNetwork();
};
