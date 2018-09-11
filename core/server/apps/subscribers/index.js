const router = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),
    // Dirty requires
    labs = require('../../services/labs');

module.exports = {
    activate(ghost) {
        // routeKeywords.subscribe: 'subscribe'
        const subscribeRoute = '/subscribe/';
        // TODO, how to do all this only if the Subscribers flag is set?!
        registerHelpers(ghost);

        ghost.routeService.registerRouter(subscribeRoute, function labsEnabledRouter(req, res, next) {
            if (labs.isSet('subscribers')) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
