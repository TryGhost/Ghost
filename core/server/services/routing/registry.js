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

    getFirstCollectionRouter() {
        return _.find(routers, (router) => {
            if (router.name === 'CollectionRouter') {
                return router;
            }

            return false;
        });
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
