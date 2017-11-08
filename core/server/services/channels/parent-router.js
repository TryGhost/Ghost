var express = require('express'),
    channelLoader = require('./loader'),
    channelRouter = require('./router');

module.exports = function channelsRouter() {
    var channelsRouter = express.Router({mergeParams: true});

    channelLoader.list().forEach(function (channel) {
        // Mount this channel router on the parent channels router
        channelsRouter.use(channel.route, channelRouter(channel));
    });

    return channelsRouter;
};
