const _ = require('lodash');
let routes = [];
let routers = {};

module.exports = {
    setRoute(routerName, route) {
        routes.push({route: route, from: routerName});
    },

    setRouter(name, router) {
        routers[name] = router;
    },

    getAllRoutes() {
        return _.cloneDeep(routes);
    },

    getRouter(name) {
        return routers[name];
    },

    /**
     * https://github.com/TryGhost/Team/issues/65#issuecomment-393622816
     *
     * Hierarchy for primary rss url:
     *
     * - index collection (/)
     * - if you only have one collection, we take this rss url
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

    resetAllRoutes() {
        routes = [];
    },

    resetAllRouters() {
        _.each(routers, (value) => {
            value.reset();
        });

        routers = {};
    }
};
