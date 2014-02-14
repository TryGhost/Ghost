
var path = require('path'),
    _    = require('lodash'),
    when = require('when'),
    appProxy = require('./proxy'),
    config = require('../config'),
    AppSandbox = require('./sandbox'),
    AppDependencies = require('./dependencies'),
    loader;

// Get the full path to an app by name
function getAppAbsolutePath(name) {
    return path.join(config().paths.appPath, name);
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

function getAppByName(name) {
    // Grab the app class to instantiate
    var AppClass = loadApp(getAppRelativePath(name)),
        app;

    // Check for an actual class, otherwise just use whatever was returned
    if (_.isFunction(AppClass)) {
        app = new AppClass(appProxy);
    } else {
        app = AppClass;
    }

    return app;
}

// The loader is responsible for loading apps
loader = {
    // Load a app and return the instantiated app
    installAppByName: function (name) {
        // Install the apps dependendencies first
        var deps = new AppDependencies(getAppAbsolutePath(name));
        return deps.install().then(function () {
            var app = getAppByName(name);

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
        var app = getAppByName(name);

        // Check for an activate() method on the app.
        if (!_.isFunction(app.activate)) {
            return when.reject(new Error("Error loading app named " + name + "; no activate() method defined."));
        }

        // Wrapping the activate() with a when because it's possible
        // to not return a promise from it.
        return when(app.activate(appProxy)).then(function () {
            return when.resolve(app);
        });
    }
};

module.exports = loader;