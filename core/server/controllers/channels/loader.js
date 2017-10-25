var _ = require('lodash'),
    channels = [];

function loadConfig() {
    var channelConfig = {};

    // This is a very dirty temporary hack so that we can test out channels with some Beta testers
    // If you are reading this code, and considering using it, best reach out to us on Slack
    // Definitely don't be angry at us if the structure of the JSON changes or this goes away.
    try {
        channelConfig = require('../../../../config.channels.json');
    } catch (err) {
        channelConfig = require('./config.channels.json');
    }

    return channelConfig;
}

module.exports.list = function list() {
    _.each(loadConfig(), function (channelConfig, channelName) {
        var channel = _.cloneDeep(channelConfig);
        channel.name = channelName;
        channels.push(channel);
    });

    return channels;
};
