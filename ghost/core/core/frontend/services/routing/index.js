const registry = require('./registry');
const RouterManager = require('./RouterManager');
const routerManager = new RouterManager({registry});

module.exports = {
    routerManager: routerManager,

    get registry() {
        return registry;
    }
};
