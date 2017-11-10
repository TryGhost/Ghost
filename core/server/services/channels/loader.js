var debug = require('ghost-ignition').debug('channels:loader'),
    _ = require('lodash'),
    path = require('path'),
    Channel = require('./Channel'),
    channels = [];

function loadConfig() {
    var channelConfig = {};

    // This is a very dirty temporary hack so that we can test out channels with some Beta testers
    // If you are reading this code, and considering using it, best reach out to us on Slack
    // Definitely don't be angry at us if the structure of the JSON changes or this goes away.
    try {
        channelConfig = require(path.join(process.cwd(), 'config.channels.json'));
    } catch (err) {
        channelConfig = require('./config.channels.json');
    }

    return channelConfig;
}

module.exports.list = function list() {
    debug('Load channels start');
    _.each(loadConfig(), function (channelConfig, channelName) {
        channels.push(new Channel(channelName, channelConfig));
    });

    debug('Load channels end');
    return channels;
};
