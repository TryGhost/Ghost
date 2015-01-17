var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),
    utils       = require('../utils'),
    _           = require('lodash'),

    frontendRoutes;

frontendRoutes = function () {
    var router = express.Router(),
        subdir = config.paths.subdir;

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });

    // ### Frontend routes
    _.forOwn(config.routes, function configureRoute(route) {
        router.get(route.path, frontend[route.controller]);
    });

    // ### Frontend aliases
    _.forOwn(config.aliases, function configureAlias(aliasConfig) {
        router.get(aliasConfig.reqPath, function redirect(req, res) {
            // Get response path from config
            var aliasConfig = _.find(config.aliases, function isPath(alias) {
                    return alias.reqPath === this.path;
                }, req.route),
                path = aliasConfig.resPath;

            // Substitute route params
            _.forOwn(req.params, function (value, key) {
                path = path.replace(':' + key, value);
            });

            if (_.has(aliasConfig, 'status')) {
                res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
                res.redirect(aliasConfig.status, subdir + path);
            } else {
                res.redirect(subdir + path);
            }
        });
    });

    return router;
};

module.exports = frontendRoutes;
