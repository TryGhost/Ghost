process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

require('../../core/server/overrides');

const {mochaHooks} = require('@tryghost/express-test').snapshot;
exports.mochaHooks = mochaHooks;
