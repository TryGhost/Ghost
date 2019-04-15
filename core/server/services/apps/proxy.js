const _ = require('lodash');
const api = require('../../api/v0.1');
const helpers = require('../../helpers/register');
const filters = require('../../filters');
const common = require('../../lib/common');
const routingService = require('../routing');

module.exports.getInstance = function getInstance(name) {
    if (!name) {
        throw new Error(common.i18n.t('errors.apps.mustProvideAppName.error'));
    }

    const appRouter = routingService.registry.getRouter('appRouter');

    const passThruAppContextToApi = (apiMethods) => {
        const appContext = {
            app: name
        };

        return _.reduce(apiMethods, function (memo, apiMethod, methodName) {
            memo[methodName] = function (...args) {
                const options = args[args.length - 1];

                if (_.isObject(options)) {
                    options.context = _.clone(appContext);
                }
                return apiMethod.apply({}, args);
            };

            return memo;
        }, {});
    };

    return {
        filters: {
            register: filters.registerFilter.bind(filters),
            deregister: filters.deregisterFilter.bind(filters)
        },
        helpers: {
            register: helpers.registerThemeHelper.bind(helpers),
            registerAsync: helpers.registerAsyncThemeHelper.bind(helpers)
        },
        // Expose the route service...
        routeService: {
            // This allows for mounting an entirely new Router at a path...
            registerRouter: appRouter.mountRouter.bind(appRouter)
        },
        // Mini proxy to the API - needs review
        api: {
            posts: passThruAppContextToApi(
                _.pick(api.posts, 'browse', 'read', 'edit', 'add', 'destroy')
            ),
            tags: passThruAppContextToApi(
                _.pick(api.tags, 'browse')
            ),
            notifications: passThruAppContextToApi(
                _.pick(api.notifications, 'browse', 'add', 'destroy')
            ),
            settings: passThruAppContextToApi(
                _.pick(api.settings, 'browse', 'read', 'edit')
            )
        }
    };
};
