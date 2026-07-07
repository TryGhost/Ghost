const _ = require('lodash');

/**
 * @description The router registry is helpful for debugging purposes and let's you search existing routes and routers.
 */
class RouterRegistry {
    constructor() {
        this.routes = [];
        this.routers = {};
    }

    /**
     * @description Get's called if you register a url pattern in express.
     * @param {string} routerName
     * @param {string} route
     */
    setRoute(routerName, route) {
        this.routes.push({route: route, from: routerName});
    }

    /**
     * @description Get's called if you register a router in express.
     * @param {string} name
     * @param {import('express').Router} router
     */
    setRouter(name, router) {
        this.routers[name] = router;
    }

    /**
     * @description Get all registered routes.
     * @returns {Array}
     */
    getAllRoutes() {
        return _.cloneDeep(this.routes);
    }

    /**
     * @description Get router by name.
     * @param {string} name
     * @returns {import('express').Router}
     */
    getRouter(name) {
        return this.routers[name];
    }

    /**
     * Gets a router by it's internal router name
     * @param {string} name internal router name
     * @returns {import('express').Router}
     */
    getRouterByName(name) {
        for (let routerKey in this.routers) {
            if (this.routers[routerKey].name === name) {
                return this.routers[routerKey];
            }
        }
    }

    /**
     *
     *
     * Hierarchy for primary rss url:
     *
     * - index collection (/)
     * - if you only have one collection, we take this rss url
     * - if you have multiple collections without index, take the first one with RSS enabled
     */
    /**
     * @description Helper to figure out the primary rss url.
     *
     * If you either configure multiple collections or your collection does not live on "/", we need to know
     * what your primary rss url is, otherwise /rss could be 404.
     *
     * More context: https://github.com/TryGhost/Team/issues/65#issuecomment-393622816
     *
     * @param {Object} options
     * @returns {string}
     */
    getRssUrl(options) {
        let rssUrl = null;

        const collectionIndexRouter = _.find(this.routers, {name: 'CollectionRouter', routerName: 'index'});

        if (collectionIndexRouter) {
            rssUrl = collectionIndexRouter.getRssUrl(options);

            // CASE: is rss enabled?
            if (rssUrl) {
                return rssUrl;
            }
        }

        const collectionRouters = _.filter(this.routers, {name: 'CollectionRouter'});

        if (collectionRouters && collectionRouters.length === 1) {
            rssUrl = collectionRouters[0].getRssUrl(options);

            // CASE: is rss enabled?
            if (rssUrl) {
                return rssUrl;
            }
        } else if (collectionRouters && collectionRouters.length > 1) {
            // CASE: multiple collections without index - return first one with RSS enabled
            for (const router of collectionRouters) {
                rssUrl = router.getRssUrl(options);
                if (rssUrl) {
                    return rssUrl;
                }
            }
        }

        return rssUrl;
    }

    /**
     * @description Reset all routes.
     */
    resetAllRoutes() {
        this.routes = [];
    }

    /**
     * @description Reset all routers.
     */
    resetAllRouters() {
        _.each(this.routers, (value) => {
            if (value && typeof value.reset === 'function') {
                value.reset();
            }
        });

        this.routers = {};
    }

    /**
     * @description Clear all routers (for testing).
     */
    clearAllRouters() {
        this.routers = {};
    }
}

module.exports = RouterRegistry;
