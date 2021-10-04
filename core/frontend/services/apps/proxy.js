const helperService = require('../../services/helpers');
const routingService = require('../../services/routing');

module.exports.getInstance = function getInstance() {
    const appRouter = routingService.registry.getRouter('appRouter');

    return {
        helperService: {
            registerAlias: helperService.registerAlias.bind(helperService),
            registerHelper: helperService.registerHelper.bind(helperService),
            registerDir: helperService.registerDir.bind(helperService)
        },
        // Expose the route service...
        routeService: {
            // This allows for mounting an entirely new Router at a path...
            registerRouter: appRouter.mountRouter.bind(appRouter)
        }
    };
};
