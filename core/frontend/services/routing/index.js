const registry = require('./registry');
const RouterManager = require('./router-manager');
const routerManager = new RouterManager({registry});

module.exports = {
    routerManager: routerManager,

    get registry() {
        return registry;
    },

    get helpers() {
        return require('./helpers');
    }
};
