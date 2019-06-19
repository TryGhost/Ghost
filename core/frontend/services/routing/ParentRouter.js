/**
 * # Parent Router
 *
 * A wrapper around express.Router, which is controlled in Ghost.
 *
 * Intended to be extended anywhere that routes need to be registered in Ghost.
 * Only allows for .use and .get at the moment - we don't have clear use-cases for anything else yet.
 */

const debug = require('ghost-ignition').debug('services:routing:ParentRouter'),
    EventEmitter = require('events').EventEmitter,
    express = require('express'),
    _ = require('lodash'),
    url = require('url'),
    security = require('../../../server/lib/security'),
    urlUtils = require('../../../server/lib/url-utils'),
    registry = require('./registry');

/**
 * @description Inherited express router, which gives control to us.
 *
 * Purposes:
 *   - give the router a correct name
 *   - give the router a correct parent
 *
 * @param {Object} options
 * @returns {Express-Router}
 * @constructor
 */
function GhostRouter(options) {
    const router = express.Router(options);

    function innerRouter(req, res, next) {
        return innerRouter.handle(req, res, next);
    }

    Object.setPrototypeOf(innerRouter, router);

    Object.defineProperty(innerRouter, 'name', {
        value: options.parent.name,
        writable: false
    });

    innerRouter.parent = options.parent;
    return innerRouter;
}

class ParentRouter extends EventEmitter {
    constructor(name) {
        super();

        this.identifier = security.identifier.uid(10);

        this.name = name;
        this._router = GhostRouter({mergeParams: true, parent: this});
    }

    /**
     * @description Helper function to find the site router in the express router stack.
     * @param {Object} req
     * @returns {Express-Router}
     * @private
     */
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

    /**
     * @description Helper function to handle redirects across routers.
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     * @param {String} slug
     * @private
     */
    _respectDominantRouter(req, res, next, slug) {
        let siteRouter = this._getSiteRouter(req);
        let targetRoute = null;

        // CASE: iterate over routers and check whether a router has a redirect for the target slug enabled.
        siteRouter.handle.stack.every((router) => {
            if (router.handle.parent && router.handle.parent.isRedirectEnabled && router.handle.parent.isRedirectEnabled(this.getResourceType(), slug)) {
                targetRoute = router.handle.parent.getRoute();
                return false;
            }

            return true;
        });

        if (targetRoute) {
            debug('_respectDominantRouter');

            // CASE: transform /tag/:slug/ -> /tag/[a-zA-Z0-9-_]+/ to able to find url pieces to append
            // e.g. /tag/bacon/page/2/  -> 'page/2' (to append)
            // e.g. /bacon/welcome/     -> '' (nothing to append)
            const matchPath = this.permalinks.getValue().replace(/:\w+/g, '[a-zA-Z0-9-_]+');
            const toAppend = req.url.replace(new RegExp(matchPath), '');

            return urlUtils.redirect301(res, url.format({
                pathname: urlUtils.createUrl(urlUtils.urlJoin(targetRoute, toAppend), false, false, true),
                search: url.parse(req.originalUrl).search
            }));
        }

        next();
    }

    /**
     * @description Mount a router on a router (sub-routing)
     * @param {String} path
     * @param {Express-Router} router
     */
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

    /**
     * @description Mount a route on this router.
     * @param {String} path
     * @param {Function} controller
     */
    mountRoute(path, controller) {
        debug(this.name + ': mountRoute for', path, controller.name);
        registry.setRoute(this.name, path);
        this._router.get(path, controller);
    }

    /**
     * @description Unmount route.
     *
     * Not used at the moment, but useful to keep for e.g. deregister routes on runtime.
     *
     * @param {String} path
     */
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

    /**
     * @description Very important function to get the actual express router, which satisfies express.
     * @returns {Express-Router}
     */
    router() {
        return this._router;
    }

    /**
     * @description Get configured permalinks of this router.
     * @returns {Object}
     */
    getPermalinks() {
        return this.permalinks;
    }

    /**
     * @description Get configured filter of this router.
     * @returns {String}
     */
    getFilter() {
        return this.filter;
    }

    /**
     * @description Get main route of this router.
     *
     * Will return the full route including subdirectory. Do not use this function to mount routes for now,
     * because the subdirectory is already mounted as exclusive feature (independent of dynamic routing).
     *
     * @param {Object} options
     * @returns {String}
     */
    getRoute(options) {
        options = options || {};

        return urlUtils.createUrl(this.route.value, options.absolute, options.secure);
    }

    /**
     * @description Figure out if the router has a redirect enabled.
     * @param {String} routerType
     * @param {String} slug
     * @returns {boolean}
     */
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
