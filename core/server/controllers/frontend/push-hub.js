var _                       = require('lodash'),
    express                 = require('express'),
    config                  = require('../../config'),
    pushSubscriptionHandler = require('../../push/subscription-handler'),

    pushHubRouter;

pushHubRouter = function pushHubRouter(middleware) {
    var router = express.Router({mergeParams: true}),
        stack = _.values(middleware);

    stack.push(pushSubscriptionHandler);

    router.post(config.urlFor('hub'), stack);

    return router;
};

module.exports.router = pushHubRouter;
