// Config for logging and metrics, for the packages that read this file
// themselves. Ghost's application builds its own logger from the same options:
// see bootstrap/logging-options.ts.
//
// @tryghost/logging require()s this file inside a try/catch and falls back to
// {} on a throw, so a mistake here silently replaces the configured transports
// with the defaults.
const config = require('./core/shared/config');
const { loggingOptions } = require('./bootstrap/logging-options');

module.exports = loggingOptions(config);
