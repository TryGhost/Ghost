/**
 * # Channel Service
 *
 * The channel service is responsible for:
 * - maintaining the config of available Channels
 * - building out the logic of how an individual Channel works
 */

module.exports.channelRouter = require('./router');
// A mechanism to load the current channels
module.exports.load = require('./loader').list;
