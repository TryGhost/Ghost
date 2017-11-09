var ParentRouter = require('../route').ParentRouter,
    loader = require('./loader'),
    channelRouter = require('./router');

/**
 * Channels Router
 * Parent channels router will load & mount all routes when
 * .router() is called. This allows for reloading.
 */
module.exports.router = function channelsRouter() {
    var channelsRouter = new ParentRouter('channels');

    loader.list().forEach(function (channel) {
        // Create a new channelRouter, and mount it onto the parent at the correct route
        channelsRouter.mountRouter(channel.route, channelRouter(channel));
    });

    return channelsRouter.router();
};
