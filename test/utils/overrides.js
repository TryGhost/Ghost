process.env.NODE_ENV = process.env.NODE_ENV || 'testing';

/**
 * This overrides file should be used for all tests that DO NOT use the DB - e.g. unit tests
 */

process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

require('../../core/server/overrides');

const {mochaHooks} = require('@tryghost/express-test').snapshot;
module.exports.mochaHooks = mochaHooks;
