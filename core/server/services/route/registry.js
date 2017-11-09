var _ = require('lodash'),
    routes = [];

module.exports = {
    set(routerName, route) {
        routes.push({route: route, from: routerName});
    },

    getAll() {
        return _.cloneDeep(routes);
    }
};
