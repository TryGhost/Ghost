var _ = require('lodash'),
    channelConfig;

module.exports.list = function list() {
    // This is a very dirty temporary hack so that we can test out channels with some Beta testers
    // If you are reading this code, and considering using it, best reach out to us on Slack
    // Definitely don't be angry at us if the structure of the JSON changes or this goes away.
    try {
        channelConfig = require('../../../../config.channels.json');
    } catch (err) {
        channelConfig = require('./config.channels.json')
    }

    return channelConfig;
};

// @TODO refactor this away, it is current only used by tests
module.exports.get = function get(name) {
    return _.cloneDeep(channelConfig[name]);
};
