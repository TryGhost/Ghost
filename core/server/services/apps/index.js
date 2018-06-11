var debug = require('ghost-ignition').debug('services:apps'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    api = require('../../api'),
    common = require('../../lib/common'),
    config = require('../../config'),
    settingsCache = require('../settings/cache'),
    loader = require('./loader'),
    // Internal apps are in config
    internalApps = config.get('apps:internal'),
    // Holds the available apps
    availableApps = {};

function recordLoadedApp(name, loadedApp) {
    // After loading the app, add it to our hash of loaded apps
    availableApps[name] = loadedApp;
    return loadedApp;
}

function saveInstalledApps(installedApps) {
    debug('saving begin');
    var currentInstalledApps = settingsCache.get('installed_apps'),
        // Never save internal apps
        updatedAppsInstalled = _.difference(_.uniq(installedApps.concat(currentInstalledApps)), internalApps);

    if (_.difference(updatedAppsInstalled, currentInstalledApps).length === 0) {
        debug('saving unneeded');
        return new Promise.resolve();
    }

    debug('saving settings');
    return api.settings.edit({
        settings: [{
            key: 'installed_apps',
            value: updatedAppsInstalled
        }]
    }, {context: {internal: true}});
}

module.exports = {
    init: function () {
        debug('init begin');
        var activeApps = settingsCache.get('active_apps'),
            installedApps = settingsCache.get('installed_apps'),
            // Load means either activate, or install and activate
            // We load all Active Apps, and all Internal Apps
            appsToLoad = activeApps.concat(internalApps);

        function loadApp(appName) {
            // If internal or already installed, the app only needs activating
            if (_.includes(internalApps, appName) || _.includes(installedApps, appName)) {
                return loader.activateAppByName(appName).then(function (loadedApp) {
                    return recordLoadedApp(appName, loadedApp);
                });
            }

            // Else first install, then activate the app
            return loader.installAppByName(appName).then(function () {
                return loader.activateAppByName(appName);
            }).then(function (loadedApp) {
                return recordLoadedApp(appName, loadedApp);
            });
        }

        return Promise.map(appsToLoad, loadApp)
            .then(function () {
                // Save our installed apps to settings
                return saveInstalledApps(_.keys(availableApps));
            })
            .catch(function (err) {
                common.logging.error(new common.errors.GhostError({
                    err: err,
                    context: common.i18n.t('errors.apps.appWillNotBeLoaded.error'),
                    help: common.i18n.t('errors.apps.appWillNotBeLoaded.help')
                }));
            });
    },
    availableApps: availableApps
};
