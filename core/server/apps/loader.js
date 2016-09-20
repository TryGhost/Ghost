
var path = require('path'),
    _    = require('lodash'),
    Promise = require('bluebird'),
    AppProxy = require('./proxy'),
    config = require('../config'),
    AppSandbox = require('./sandbox'),
    AppDependencies = require('./dependencies'),
    AppPermissions = require('./permissions'),
    i18n = require('../i18n'),
    loader;

function isInternalApp(name) {
    return _.includes(config.internalApps, name);
}

// Get the full path to an app by name
function getAppAbsolutePath(name) {
    if (isInternalApp(name)) {
        return path.join(config.paths.internalAppPath, name);
    }

    return path.join(config.paths.appPath, name);
}

// Get a relative path to the given apps root, defaults
// to be relative to __dirname
function getAppRelativePath(name, relativeTo) {
    relativeTo = relativeTo || __dirname;

    var relativePath = path.relative(relativeTo, getAppAbsolutePath(name));

    if (relativePath.charAt(0) !== '.') {
        relativePath = './' + relativePath;
    }

    return relativePath;
}

// Load apps through a pseudo sandbox
function loadApp(appPath, isInternal) {
    var sandbox = new AppSandbox({internal: isInternal});

    return sandbox.loadApp(appPath);
}

function getAppByName(name, permissions) {
    // Grab the app class to instantiate
    var AppClass = loadApp(getAppRelativePath(name), isInternalApp(name)),
        appProxy = new AppProxy({
            name: name,
            permissions: permissions,
            internal: isInternalApp(name)
        }),
        app;

    // Check for an actual class, otherwise just use whatever was returned
    if (_.isFunction(AppClass)) {
        app = new AppClass(appProxy);
    } else {
        app = AppClass;
    }

    return {
        app: app,
        proxy: appProxy
    };
}

// The loader is responsible for loading apps
loader = {
    // Load a app and return the instantiated app
    installAppByName: function (name) {
        // Install the apps dependencies first
        var appPath = getAppAbsolutePath(name),
            deps = new AppDependencies(appPath);

        return deps.install()
            .then(function () {
                // Load app permissions
                var perms = new AppPermissions(appPath);

                return perms.read().catch(function (err) {
                    // Provide a helpful error about which app
                    return Promise.reject(new Error(i18n.t('errors.apps.permissionsErrorLoadingApp.error', {name: name, message: err.message})));
                });
            })
            .then(function (appPerms) {
                var appInfo = getAppByName(name, appPerms),
                    app = appInfo.app,
                    appProxy = appInfo.proxy;

                // Check for an install() method on the app.
                if (!_.isFunction(app.install)) {
                    return Promise.reject(new Error(i18n.t('errors.apps.noInstallMethodLoadingApp.error', {name: name})));
                }

                // Run the app.install() method
                // Wrapping the install() with a when because it's possible
                // to not return a promise from it.
                return Promise.resolve(app.install(appProxy)).return(app);
            });
    },

    // Activate a app and return it
    activateAppByName: function (name) {
        var perms = new AppPermissions(getAppAbsolutePath(name));

        return perms.read().then(function (appPerms) {
            var appInfo = getAppByName(name, appPerms),
                app = appInfo.app,
                appProxy = appInfo.proxy;

            // Check for an activate() method on the app.
            if (!_.isFunction(app.activate)) {
                return Promise.reject(new Error(i18n.t('errors.apps.noActivateMethodLoadingApp.error', {name: name})));
            }

            // Wrapping the activate() with a when because it's possible
            // to not return a promise from it.
            return Promise.resolve(app.activate(appProxy)).return(app);
        });
    }
};

module.exports = loader;
