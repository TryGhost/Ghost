var _ = require('lodash'),
    Promise = require('bluebird'),
    logging = require('../../logging'),
    errors = require('../../errors'),
    api = require('../../api'),
    i18n = require('../../i18n'),
    config = require('../../config'),
    settingsCache = require('../../settings/cache'),
    loader = require('./loader'),
    // Holds the available apps
    availableApps = {};

function getInstalledApps() {
    var installedApps = settingsCache.get('installed_apps'),
        internalApps = config.get('apps:internal');

    return installedApps.concat(internalApps);
}

function saveInstalledApps(installedApps) {
    var currentInstalledApps = getInstalledApps(),
        updatedAppsInstalled = _.difference(_.uniq(installedApps.concat(currentInstalledApps)), config.get('apps:internal'));

    return api.settings.edit({settings: [{key: 'installed_apps', value: updatedAppsInstalled}]}, {context: {internal: true}});
}

module.exports = {
    init: function () {
        var activeApps = settingsCache.get('active_apps'),
            installedApps = getInstalledApps(),
            internalApps = config.get('apps:internal'),
            appsToLoad = activeApps.concat(internalApps),
            loadedApps = {},
            loadPromises;

        function recordLoadedApp(name, loadedApp) {
            // After loading the app, add it to our hash of loaded apps
            loadedApps[name] = loadedApp;

            return Promise.resolve(loadedApp);
        }

        // Grab all installed apps, install any not already installed that are in appsToLoad.
        loadPromises = _.map(appsToLoad, function (app) {
            // If already installed, just activate the app
            if (_.includes(installedApps, app)) {
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
            logging.error(new errors.GhostError({
                err: err,
                context: i18n.t('errors.apps.appWillNotBeLoaded.error'),
                help: i18n.t('errors.apps.appWillNotBeLoaded.help')
            }));
        });
    },
    availableApps: availableApps
};
