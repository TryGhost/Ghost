var router     = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    labs = require('../../services/labs');

module.exports = {
    activate: function activate(ghost) {
        // routeKeywords.subscribe: 'subscribe'
        var subscribeRoute = '/subscribe/';
        // TODO, how to do all this only if the Subscribers flag is set?!
        registerHelpers(ghost);

        ghost.routeService.registerRouter(subscribeRoute, function labsEnabledRouter(req, res, next) {
            if (labs.isSet('subscribers') === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
