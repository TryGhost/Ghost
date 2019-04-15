const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const config = require('../../config');
const common = require('../../lib/common');
const AppProxy = require('./proxy');
const Sandbox = require('./sandbox');
const AppDependencies = require('./dependencies');
const AppPermissions = require('./permissions');

// Get the full path to an app by name
function getAppAbsolutePath(name) {
    return path.join(config.get('paths').internalAppPath, name);
}

// Get a relative path to the given apps root, defaults
// to be relative to __dirname
function getAppRelativePath(name, relativeTo = __dirname) {
    const relativePath = path.relative(relativeTo, getAppAbsolutePath(name));

    if (relativePath.charAt(0) !== '.') {
        return './' + relativePath;
    }

    return relativePath;
}

// Load apps through a pseudo sandbox
function loadApp(appPath) {
    return Sandbox.loadApp(appPath);
}

function getAppByName(name, permissions) {
    // Grab the app class to instantiate
    const AppClass = loadApp(getAppRelativePath(name));
    const proxy = new AppProxy({
        name,
        permissions,
        internal: true
    });

    // Check for an actual class, otherwise just use whatever was returned
    const app = _.isFunction(AppClass) ? new AppClass(proxy) : AppClass;

    return {
        app,
        proxy
    };
}

module.exports = {
    // Load a app and return the instantiated app
    installAppByName: function (name) {
        // Install the apps dependencies first
        const appPath = getAppAbsolutePath(name);
        const deps = new AppDependencies(appPath);

        return deps.install()
            .then(function () {
                // Load app permissions
                const perms = new AppPermissions(appPath);

                return perms.read().catch(function (err) {
                    // Provide a helpful error about which app
                    return Promise.reject(new Error(common.i18n.t('errors.apps.permissionsErrorLoadingApp.error', {
                        name: name,
                        message: err.message
                    })));
                });
            })
            .then(function (appPerms) {
                const {app, proxy} = getAppByName(name, appPerms);

                // Check for an install() method on the app.
                if (!_.isFunction(app.install)) {
                    return Promise.reject(new Error(common.i18n.t('errors.apps.noInstallMethodLoadingApp.error', {name: name})));
                }

                // Run the app.install() method
                // Wrapping the install() with a when because it's possible
                // to not return a promise from it.
                return Promise.resolve(app.install(proxy)).return(app);
            });
    },

    // Activate a app and return it
    activateAppByName: function (name) {
        const perms = new AppPermissions(getAppAbsolutePath(name));

        return perms.read().then(function (appPerms) {
            const {app, proxy} = getAppByName(name, appPerms);

            // Check for an activate() method on the app.
            if (!_.isFunction(app.activate)) {
                return Promise.reject(new Error(common.i18n.t('errors.apps.noActivateMethodLoadingApp.error', {name: name})));
            }

            // Wrapping the activate() with a when because it's possible
            // to not return a promise from it.
            return Promise.resolve(app.activate(proxy)).return(app);
        });
    }
};
