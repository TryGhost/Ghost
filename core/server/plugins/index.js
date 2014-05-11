
var _           = require('underscore'),
    when        = require('when'),
    errors      = require('../errorHandling'),
    api         = require('../api'),
    loader      = require('./loader'),
    // Holds the available plugins
    availablePlugins = {};


function getInstalledPlugins() {
    return api.settings.read('installedPlugins').then(function (installed) {
        installed.value = installed.value || '[]';

        try {
            installed = JSON.parse(installed.value);
        } catch (e) {
            return when.reject(e);
        }

        return installed;
    });
}

function saveInstalledPlugins(installedPlugins) {
    return getInstalledPlugins().then(function (currentInstalledPlugins) {
        var updatedPluginsInstalled = _.uniq(installedPlugins.concat(currentInstalledPlugins));

        return api.settings.edit('installedPlugins', updatedPluginsInstalled);
    });
}

module.exports = {
    init: function () {
        var pluginsToLoad;

        try {
            // We have to parse the value because it's a string
            api.settings.read('activePlugins').then(function (aPlugins) {
                pluginsToLoad = JSON.parse(aPlugins.value) || [];
            });
        } catch (e) {
            errors.logError(
                'Failed to parse activePlugins setting value: ' + e.message,
                'Your plugins will not be loaded.',
                'Check your settings table for typos in the activePlugins value. It should look like: ["plugin-1", "plugin2"] (double quotes required).'
            );
            return when.resolve();
        }

        // Grab all installed plugins, install any not already installed that are in pluginsToLoad.
        return getInstalledPlugins().then(function (installedPlugins) {
            var loadedPlugins = {},
                recordLoadedPlugin = function (name, loadedPlugin) {
                    // After loading the plugin, add it to our hash of loaded plugins
                    loadedPlugins[name] = loadedPlugin;

                    return when.resolve(loadedPlugin);
                },
                loadPromises = _.map(pluginsToLoad, function (plugin) {
                    // If already installed, just activate the plugin
                    if (_.contains(installedPlugins, plugin)) {
                        return loader.activatePluginByName(plugin).then(function (loadedPlugin) {
                            return recordLoadedPlugin(plugin, loadedPlugin);
                        });
                    }

                    // Install, then activate the plugin
                    return loader.installPluginByName(plugin).then(function () {
                        return loader.activatePluginByName(plugin);
                    }).then(function (loadedPlugin) {
                        return recordLoadedPlugin(plugin, loadedPlugin);
                    });
                });

            return when.all(loadPromises).then(function () {
                // Save our installed plugins to settings
                return saveInstalledPlugins(_.keys(loadedPlugins));
            }).then(function () {
                // Extend the loadedPlugins onto the available plugins
                _.extend(availablePlugins, loadedPlugins);
            }).otherwise(function (err) {
                errors.logError(
                    err.message || err,
                    'The plugin will not be loaded',
                    'Check with the plugin creator, or read the plugin documentation for more details on plugin requirements'
                );
            });
        });
    },
    availablePlugins: availablePlugins
};