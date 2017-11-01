'use strict';
/**
 * An instance of router that is provided to Apps, to mount routes into.
 */

var debug = require('ghost-ignition').debug('services:routes:app'),
    Router = require('./base/Router');

class AppRouter extends Router {
    registerRouter(path, router) {
        debug('registerRouter for', path);
        this.router.use(path, router);
    }
}

module.exports = AppRouter;
