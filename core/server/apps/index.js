
var _           = require('lodash'),
    Promise     = require('bluebird'),
    errors      = require('../errors'),
    api         = require('../api'),
    loader      = require('./loader'),
    i18n        = require('../i18n'),
    // Holds the available apps
    availableApps = {};

function getInstalledApps() {
    return api.settings.read({context: {internal: true}, key: 'installedApps'}).then(function (response) {
        var installed = response.settings[0];

        installed.value = installed.value || '[]';

        try {
            installed = JSON.parse(installed.value);
        } catch (e) {
            return Promise.reject(e);
        }

        return installed;
    });
}

function saveInstalledApps(installedApps) {
    return getInstalledApps().then(function (currentInstalledApps) {
        var updatedAppsInstalled = _.uniq(installedApps.concat(currentInstalledApps));

        return api.settings.edit({settings: [{key: 'installedApps', value: updatedAppsInstalled}]}, {context: {internal: true}});
    });
}

module.exports = {
    init: function () {
        var appsToLoad;

        try {
            // We have to parse the value because it's a string
            api.settings.read({context: {internal: true}, key: 'activeApps'}).then(function (response) {
                var aApps = response.settings[0];

                appsToLoad = JSON.parse(aApps.value) || [];
            });
        } catch (e) {
            errors.logError(
                i18n.t('errors.apps.failedToParseActiveAppsSettings.error', {message: e.message}),
                i18n.t('errors.apps.failedToParseActiveAppsSettings.context'),
                i18n.t('errors.apps.failedToParseActiveAppsSettings.help')
            );

            return Promise.resolve();
        }

        // Grab all installed apps, install any not already installed that are in appsToLoad.
        return getInstalledApps().then(function (installedApps) {
            var loadedApps = {},
                recordLoadedApp = function (name, loadedApp) {
                    // After loading the app, add it to our hash of loaded apps
                    loadedApps[name] = loadedApp;

                    return Promise.resolve(loadedApp);
                },
                loadPromises = _.map(appsToLoad, function (app) {
                    // If already installed, just activate the app
                    if (_.contains(installedApps, app)) {
                        return loader.activateAppByName(app).then(function (loadedApp) {
                            return recordLoadedApp(app, loadedApp);
                        });
                    }

                    // Install, then activate the app
                    return loader.installAppByName(app).then(function () {
                        return loader.activateAppByName(app);
                    }).then(function (loadedApp) {
                        return recordLoadedApp(app, loadedApp);
                    });
                });

            return Promise.all(loadPromises).then(function () {
                // Save our installed apps to settings
                return saveInstalledApps(_.keys(loadedApps));
            }).then(function () {
                // Extend the loadedApps onto the available apps
                _.extend(availableApps, loadedApps);
            }).catch(function (err) {
                errors.logError(
                    err.message || err,
                    i18n.t('errors.apps.appWillNotBeLoaded.error'),
                    i18n.t('errors.apps.appWillNotBeLoaded.help')
                );
            });
        });
    },
    availableApps: availableApps
};
