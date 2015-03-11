var _           = require('lodash'),
    api         = require('../api'),
    helpers     = require('../helpers'),
    filters     = require('../filters'),
    generateProxyFunctions;

generateProxyFunctions = function (name, permissions) {
    var getPermission = function (perm) {
            return permissions[perm];
        },
        getPermissionToMethod = function (perm, method) {
            var perms = getPermission(perm);

            if (!perms) {
                return false;
            }

            return _.find(perms, function (name) {
                return name === method;
            });
        },
        runIfPermissionToMethod = function (perm, method, wrappedFunc, context, args) {
            var permValue = getPermissionToMethod(perm, method);

            if (!permValue) {
                throw new Error('The App "' + name + '" attempted to perform an action or access a resource (' + perm + '.' + method + ') without permission.');
            }

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
        throw new Error('Must provide an app name for api context');
    }

    if (!options.permissions) {
        throw new Error('Must provide app permissions');
    }

    _.extend(this, generateProxyFunctions(options.name, options.permissions));
}

module.exports = AppProxy;
