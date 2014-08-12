
var path = require('path'),
    _    = require('lodash'),
    when = require('when'),
    AppProxy = require('./proxy'),
    config = require('../config'),
    AppSandbox = require('./sandbox'),
    AppDependencies = require('./dependencies'),
    AppPermissions = require('./permissions'),
    loader;

// Get the full path to an app by name
function getAppAbsolutePath(name) {
    return path.join(config.paths.appPath, name);
}

// Get a relative path to the given apps root, defaults
// to be relative to __dirname
function getAppRelativePath(name, relativeTo) {
    relativeTo = relativeTo || __dirname;

    return path.relative(relativeTo, getAppAbsolutePath(name));
}

// Load apps through a psuedo sandbox
function loadApp(appPath) {
    var sandbox = new AppSandbox();

    return sandbox.loadApp(appPath);
}

function getAppByName(name, permissions) {
    // Grab the app class to instantiate
    var AppClass = loadApp(getAppRelativePath(name)),
        appProxy = new AppProxy({
            name: name,
            permissions: permissions
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
        // Install the apps dependendencies first
        var appPath = getAppAbsolutePath(name),
            deps = new AppDependencies(appPath);

        return deps.install()
            .then(function () {
                // Load app permissions
                var perms = new AppPermissions(appPath);

                return perms.read().otherwise(function (err) {
                    // Provide a helpful error about which app
                    return when.reject(new Error("Error loading app named " + name + "; problem reading permissions: " + err.message));
                });
            })
            .then(function (appPerms) {
                var appInfo = getAppByName(name, appPerms),
                    app = appInfo.app,
                    appProxy = appInfo.proxy;

                // Check for an install() method on the app.
                if (!_.isFunction(app.install)) {
                    return when.reject(new Error("Error loading app named " + name + "; no install() method defined."));
                }

                // Run the app.install() method
                // Wrapping the install() with a when because it's possible
                // to not return a promise from it.
                return when(app.install(appProxy)).then(function () {
                    return when.resolve(app);
                });
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
                return when.reject(new Error("Error loading app named " + name + "; no activate() method defined."));
            }

            // Wrapping the activate() with a when because it's possible
            // to not return a promise from it.
            return when(app.activate(appProxy)).then(function () {
                return when.resolve(app);
            });
        });
    }
};

module.exports = loader;