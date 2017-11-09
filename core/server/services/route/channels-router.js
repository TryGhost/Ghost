var ParentRouter = require('./ParentRouter'),
    channelService = require('../channels');

/**
 * Channels Router
 * Parent channels router will load & mount all routes when
 * .router() is called. This allows for reloading.
 */
module.exports.router = function channelsRouter() {
    var channelsRouter = new ParentRouter('channels');

    channelService.load().forEach(function (channel) {
        // Create a new channelRouter, and mount it onto the parent at the correct route
        channelsRouter.mountRouter(channel.route, channelService.channelRouter(channel));
    });

    return channelsRouter.router();
};
