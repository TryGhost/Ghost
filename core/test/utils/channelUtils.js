var defaultChannels = require('../../server/controllers/channels/config.channels.json'),
    Channel = require('../../server/controllers/channels/Channel');

// This is a function to get a fake or test channel
// It's currently based on the default config in Ghost itself
module.exports.getTestChannel = function getTestChannel(channelName) {
    return new Channel(channelName, defaultChannels[channelName]);
};

module.exports.getDefaultChannels = function getDefaultChannels() {
    return defaultChannels;
};

// Little shortcut
module.exports.Channel = Channel;
