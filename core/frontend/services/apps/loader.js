const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const {i18n} = require('../../../server/lib/common');
const config = require('../../../shared/config');
const Proxy = require('./proxy');

// Get the full path to an app by name
function getAppAbsolutePath(name) {
    return path.join(config.get('paths').internalAppPath, name);
}

function loadApp(name) {
    return require(getAppAbsolutePath(name));
}

function getAppByName(name) {
    // Grab the app class to instantiate
    const AppClass = loadApp(name);
    const proxy = Proxy.getInstance();

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
            return Promise.reject(new Error(i18n.t('errors.apps.noActivateMethodLoadingApp.error', {name: name})));
        }

        // Wrapping the activate() with a when because it's possible
        // to not return a promise from it.
        return Promise.resolve(app.activate(proxy)).return(app);
    }
};
