/**
 * # Channel Service
 *
 * The channel service is responsible for:
 * - maintaining the config of available Channels
 * - building out the logic of how an individual Channel works
 * - providing a top level router as an entry point
 *
 * Everything else exposed via the Channel object
 */

// Exports the top-level router
module.exports = require('./parent-router');
