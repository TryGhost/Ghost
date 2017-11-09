var ParentRouter = require('./ParentRouter'),
    channelService = require('../channels');

/**
 * Channels Router
 * Parent channels router will load & mount all routes when
 * .router() is called. This allows for reloading.
 */
module.exports.router = function channelsRouter() {
    var channelsRouter = new ParentRouter('channels');

    channelService.loader.list().forEach(function (channel) {
        // Mount this channel router on the parent channels router
        channelsRouter.mountRouter(channel.route, channelService.router(channel));
    });

    return channelsRouter.router();
};
