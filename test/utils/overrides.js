process.env.NODE_ENV = process.env.NODE_ENV || 'testing';

require('../../core/server/overrides');

const {mochaHooks} = require('@tryghost/jest-snapshot');
exports.mochaHooks = mochaHooks;
