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
    url = require('url'),
    setPrototypeOf = require('setprototypeof'),
    security = require('../../lib/security'),
    urlService = require('../url'),
    // This the route registry for the whole site
    registry = require('./registry');

function GhostRouter(options) {
    const router = express.Router(options);

    function innerRouter(req, res, next) {
        return innerRouter.handle(req, res, next);
    }

    setPrototypeOf(innerRouter, router);

    Object.defineProperty(innerRouter, 'name', {
        value: options.parent.name,
        writable: false
    });

    innerRouter.parent = options.parent;
    return innerRouter;
}

/**
 * We expose a very limited amount of express.Router via specialist methods
 */
class ParentRouter extends EventEmitter {
    constructor(name) {
        super();

        this.identifier = security.identifier.uid(10);

        this.name = name;
        this._router = GhostRouter({mergeParams: true, parent: this});
    }

    _getSiteRouter(req) {
        let siteRouter = null;

        req.app._router.stack.every((router) => {
            if (router.name === 'SiteRouter') {
                siteRouter = router;
                return false;
            }

            return true;
        });

        return siteRouter;
    }

    _respectDominantRouter(req, res, next, slug) {
        let siteRouter = this._getSiteRouter(req);
        let targetRoute = null;

        siteRouter.handle.stack.every((router) => {
            if (router.handle.parent && router.handle.parent.isRedirectEnabled && router.handle.parent.isRedirectEnabled(this.getResourceType(), slug)) {
                targetRoute = router.handle.parent.getRoute();
                return false;
            }

            return true;
        });

        if (targetRoute) {
            debug('_respectDominantRouter');

            const matchPath = this.permalinks.getValue().replace(':slug', '[a-zA-Z0-9-_]+');
            const toAppend = req.url.replace(new RegExp(matchPath), '');

            return urlService.utils.redirect301(res, url.format({
                pathname: urlService.utils.createUrl(urlService.utils.urlJoin(targetRoute, toAppend), false, false, true),
                search: url.parse(req.originalUrl).search
            }));
        }

        next();
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

    isRedirectEnabled(routerType, slug) {
        debug('isRedirectEnabled', this.name, this.route && this.route.value, routerType, slug);

        if (!this.data || !Object.keys(this.data.router)) {
            return false;
        }

        return _.find(this.data.router, function (entries, type) {
            if (routerType === type) {
                return _.find(entries, {redirect: true, slug: slug});
            }
        });
    }

    reset() {}
}

module.exports = ParentRouter;
