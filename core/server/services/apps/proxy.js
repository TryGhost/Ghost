const _ = require('lodash');
const api = require('../../api/v0.1');
const helpers = require('../../helpers/register');
const filters = require('../../filters');
const common = require('../../lib/common');
const routingService = require('../routing');

let generateProxyFunctions;

generateProxyFunctions = function (name) {
    const appRouter = routingService.registry.getRouter('appRouter');

    var runIfPermissionToMethod = function (perm, method, wrappedFunc, context, args) {
            // internal apps get all permissions
            return wrappedFunc.apply(context, args);
        },
        checkRegisterPermissions = function (perm, registerMethod) {
            return _.wrap(registerMethod, function (origRegister, name) {
                return runIfPermissionToMethod(perm, name, origRegister, this, _.toArray(arguments).slice(1));
            });
        },
        passThruAppContextToApi = function (perm, apiMethods) {
            var appContext = {
                app: name
            };

            return _.reduce(apiMethods, function (memo, apiMethod, methodName) {
                memo[methodName] = function () {
                    var args = _.toArray(arguments),
                        options = args[args.length - 1];

                    if (_.isObject(options)) {
                        options.context = _.clone(appContext);
                    }
                    return apiMethod.apply({}, args);
                };

                return memo;
            }, {});
        },
        proxy;

    proxy = {
        filters: {
            register: checkRegisterPermissions('filters', filters.registerFilter.bind(filters)),
            deregister: checkRegisterPermissions('filters', filters.deregisterFilter.bind(filters))
        },
        helpers: {
            register: checkRegisterPermissions('helpers', helpers.registerThemeHelper.bind(helpers)),
            registerAsync: checkRegisterPermissions('helpers', helpers.registerAsyncThemeHelper.bind(helpers))
        },
        // Expose the route service...
        routeService: {
            // This allows for mounting an entirely new Router at a path...
            registerRouter: checkRegisterPermissions('routes', appRouter.mountRouter.bind(appRouter))
        },
        // Mini proxy to the API - needs review
        api: {
            posts: passThruAppContextToApi('posts',
                _.pick(api.posts, 'browse', 'read', 'edit', 'add', 'destroy')
            ),
            tags: passThruAppContextToApi('tags',
                _.pick(api.tags, 'browse')
            ),
            notifications: passThruAppContextToApi('notifications',
                _.pick(api.notifications, 'browse', 'add', 'destroy')
            ),
            settings: passThruAppContextToApi('settings',
                _.pick(api.settings, 'browse', 'read', 'edit')
            )
        }
    };

    return proxy;
};

function AppProxy(options) {
    if (!options.name) {
        throw new Error(common.i18n.t('errors.apps.mustProvideAppName.error'));
    }

    if (!options.permissions) {
        throw new Error(common.i18n.t('errors.apps.mustProvideAppPermissions.error'));
    }

    _.extend(this, generateProxyFunctions(options.name));
}

module.exports = AppProxy;
