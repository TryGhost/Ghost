'use strict';
/**
 * # Router
 *
 * A wrapper around express.Router
 * Intended to be extended anywhere that routes need to be registered in Ghost
 * Only allows for .use and .get at the moment - we don't have clear use-cases for anything else yet.
 */

var debug = require('ghost-ignition').debug('services:routes:ParentRouter'),
    express = require('express'),
    // This the route registry for the whole site
    registry = require('./registry');
/**
 * We expose a very limited amount of express.Router via specialist methods
 */
class ParentRouter {
    constructor(name) {
        this.name = name;
        this._router = express.Router({mergeParams: true});
    }

    mountRouter(path, router) {
        if (arguments.length === 1) {
            router = path;
            debug(this.name + ': mountRouter: ' + router.name);
            this._router.use(router);
        } else {
            registry.set(this.name, path);
            debug(this.name + ': mountRouter: ' + router.name + ' at ' + path);
            this._router.use(path, router);
        }
    }

    mountRoute(path, controller) {
        debug(this.name + ': mountRoute for', path, controller.name);
        registry.set(this.name, path);
        this._router.get(path, controller);
    }

    router() {
        // @TODO: should this just be the handler that is returned?
        // return this._router.handle.bind(this._router);
        return this._router;
    }
}

module.exports = ParentRouter;
