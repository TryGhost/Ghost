const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const config = require('../../config');
const common = require('../../lib/common');
const Proxy = require('./proxy');
const Sandbox = require('./sandbox');

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

function getAppByName(name) {
    // Grab the app class to instantiate
    const AppClass = Sandbox.loadApp(getAppRelativePath(name));
    const proxy = Proxy.getInstance(name);

    // Check for an actual class, otherwise just use whatever was returned
    const app = _.isFunction(AppClass) ? new AppClass(proxy) : AppClass;

    return {
        app,
        proxy
    };
}

module.exports = {
    // Activate a app and return it
    activateAppByName: function (name) {
        const {app, proxy} = getAppByName(name);

        // Check for an activate() method on the app.
        if (!_.isFunction(app.activate)) {
            return Promise.reject(new Error(common.i18n.t('errors.apps.noActivateMethodLoadingApp.error', {name: name})));
        }

        // Wrapping the activate() with a when because it's possible
        // to not return a promise from it.
        return Promise.resolve(app.activate(proxy)).return(app);
    }
};
