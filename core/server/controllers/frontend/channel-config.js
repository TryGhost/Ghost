var _ = require('lodash'),
    channelConfig = require('./config.channels.json');

// @TODO expand this to support loading channels from different places?
module.exports.list = function list() {
    return channelConfig;
};

// @TODO refactor this away, it is current only used by tests
module.exports.get = function get(name) {
    return _.cloneDeep(channelConfig[name]);
};
