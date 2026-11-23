// What @tryghost/logging and @tryghost/metrics build themselves from when one of them is
// loaded before, or without, Ghost's start: in a worker thread, a test or a command.
//
// Ghost's start builds both from the same values (bootstrap/foundation.ts). This file leaves
// when nothing loads them any other way.
//
// @tryghost/logging require()s this file inside a try/catch and falls back to {} on a throw,
// and assigns `transports` itself for worker threads, so what we hand back must be an object
// of our own, never config's.
const config = require('./core/shared/config');
const { loggingValues } = require('./bootstrap/values/logging');

module.exports = loggingValues(config);
