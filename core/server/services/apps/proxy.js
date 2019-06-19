const helpers = require('../../../frontend/helpers/register');
const routingService = require('../../../frontend/services/routing');

module.exports.getInstance = function getInstance() {
    const appRouter = routingService.registry.getRouter('appRouter');

    return {
        helpers: {
            register: helpers.registerThemeHelper.bind(helpers),
            registerAsync: helpers.registerAsyncThemeHelper.bind(helpers)
        },
        // Expose the route service...
        routeService: {
            // This allows for mounting an entirely new Router at a path...
            registerRouter: appRouter.mountRouter.bind(appRouter)
        }
    };
};
