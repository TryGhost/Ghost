var defaultChannels = require('../../server/controllers/frontend/config.channels.json');

// This is a function to get a fake or test channel
// It's currently based on the default config in Ghost itself
module.exports.getTestChannel = function getTestChannel(channelName) {
    return defaultChannels[channelName];
};
