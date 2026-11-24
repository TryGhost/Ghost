// What @tryghost/logging and @tryghost/metrics build themselves from when they
// are loaded without Ghost's boot: metrics always, logging in a worker thread
// or when a test loads it first. Boot builds Ghost's logger from the same
// options: see bootstrap/logging.ts.
//
// @tryghost/logging require()s this file inside a try/catch and falls back to
// {} on a throw, so a mistake here silently replaces the configured transports
// with the defaults.
const config = require('./core/shared/config');
const { loggingOptions } = require('./bootstrap/logging-options');

module.exports = loggingOptions(config);
