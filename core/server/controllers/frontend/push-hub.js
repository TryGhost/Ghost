var _       = require('lodash'),
    express = require('express'),
    config  = require('../../config'),
    push    = require('../../push'),

    pushHubRouter;

pushHubRouter = function pushHubRouter(middleware) {
    var router = express.Router({mergeParams: true}),
        stack = _.values(middleware);

    stack.push(push.handleSubscription);

    router.post(config.urlFor('hub'), stack);

    return router;
};

module.exports.router = pushHubRouter;
