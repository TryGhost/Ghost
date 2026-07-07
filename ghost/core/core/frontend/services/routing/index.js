const createFacade = require('../../../shared/container/create-facade');

module.exports = createFacade('routing', () => {
    const registry = require('./registry');
    const RouterManager = require('./router-manager');
    return {
        routerManager: new RouterManager({registry}),
        registry
    };
});
