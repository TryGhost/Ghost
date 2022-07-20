const _ = require('lodash');
let routes = [];
let routers = {};

/**
 * @description The router registry is helpful for debugging purposes and let's you search existing routes and routers.
 */
module.exports = {
    /**
     * @description Get's called if you register a url pattern in express.
     * @param {String} routerName
     * @param {String} route
     */
    setRoute(routerName, route) {
        routes.push({route: route, from: routerName});
    },

    /**
     * @description Get's called if you register a router in express.
     * @param {String} name
     * @param {Express-Router} router
     */
    setRouter(name, router) {
        routers[name] = router;
    },

    /**
     * @description Get all registered routes.
     * @returns {Array}
     */
    getAllRoutes() {
        return _.cloneDeep(routes);
    },

    /**
     * @description Get router by name.
     * @param {String} name
     * @returns {Express-Router}
     */
    getRouter(name) {
        return routers[name];
    },

    /**
     * Gets a router by it's internal router name
     * @param {String} name internal router name
     * @returns {Express-Router}
     */
    getRouterByName(name) {
        for (let routerKey in routers) {
            if (routers[routerKey].name === name) {
                return routers[routerKey];
            }
        }
    },

    /**
     *
     *
     * Hierarchy for primary rss url:
     *
     * - index collection (/)
     * - if you only have one collection, we take this rss url
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
     * @returns {String}
     */
    getRssUrl(options) {
        let rssUrl = null;

        const collectionIndexRouter = _.find(routers, {name: 'CollectionRouter', routerName: 'index'});

        if (collectionIndexRouter) {
            rssUrl = collectionIndexRouter.getRssUrl(options);

            // CASE: is rss enabled?
            if (rssUrl) {
                return rssUrl;
            }
        }

        const collectionRouters = _.filter(routers, {name: 'CollectionRouter'});

        if (collectionRouters && collectionRouters.length === 1) {
            rssUrl = collectionRouters[0].getRssUrl(options);

            // CASE: is rss enabled?
            if (rssUrl) {
                return rssUrl;
            }
        }

        return rssUrl;
    },

    /**
     * @description Reset all routes.
     */
    resetAllRoutes() {
        routes = [];
    },

    /**
     * @description Reset all routers.
     */
    resetAllRouters() {
        _.each(routers, (value) => {
            value.reset();
        });

        routers = {};
    }
};
