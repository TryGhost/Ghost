/**
 * # Router
 *
 * A wrapper around express.Router
 * Intended to be extended anywhere that routes need to be registered in Ghost
 * Only allows for .use and .get at the moment - we don't have clear use-cases for anything else yet.
 */

const debug = require('ghost-ignition').debug('services:routing:ParentRouter'),
    EventEmitter = require('events').EventEmitter,
    express = require('express'),
    _ = require('lodash'),
    security = require('../../lib/security'),
    urlService = require('../url'),
    // This the route registry for the whole site
    registry = require('./registry');

/**
 * We expose a very limited amount of express.Router via specialist methods
 */
class ParentRouter extends EventEmitter {
    constructor(name) {
        super();

        this.identifier = security.identifier.uid(10);

        this.name = name;
        this._router = express.Router({mergeParams: true});
    }

    mountRouter(path, router) {
        if (arguments.length === 1) {
            router = path;
            debug(this.name + ': mountRouter: ' + router.name);
            this._router.use(router);
        } else {
            registry.setRoute(this.name, path);
            debug(this.name + ': mountRouter: ' + router.name + ' at ' + path);
            this._router.use(path, router);
        }
    }

    mountRoute(path, controller) {
        debug(this.name + ': mountRoute for', path, controller.name);
        registry.setRoute(this.name, path);
        this._router.get(path, controller);
    }

    unmountRoute(path) {
        let indexToRemove = null;

        _.each(this._router.stack, (item, index) => {
            if (item.path === path) {
                indexToRemove = index;
            }
        });

        if (indexToRemove !== null) {
            this._router.stack.splice(indexToRemove, 1);
        }
    }

    router() {
        // @TODO: should this just be the handler that is returned?
        // return this._router.handle.bind(this._router);
        return this._router;
    }

    getPermalinks() {
        return this.permalinks;
    }

    getFilter() {
        return this.filter;
    }

    /**
     * Will return the full route including subdirectory.
     * Do not use this function to mount routes for now, because the subdirectory is already mounted.
     */
    getRoute(options) {
        options = options || {};

        return urlService.utils.createUrl(this.route.value, options.absolute, options.secure);
    }

    reset() {}
}

module.exports = ParentRouter;
