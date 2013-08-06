
var _ = require("underscore"),
    when = require('when'),
    ghostApi,
    loader = require("./loader"),
    GhostPlugin = require("./GhostPlugin");

function getInstalledPlugins() {
    if (!ghostApi) {
        ghostApi = require('../api');
    }

    return ghostApi.settings.read("installedPlugins").then(function (installed) {
        installed.value = installed.value || "[]";

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

        return ghostApi.settings.edit("installedPlugins", updatedPluginsInstalled);
    });
}

module.exports = {
    GhostPlugin: GhostPlugin,

    init: function (ghost, pluginsToLoad) {
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
                        return loader.activatePluginByName(plugin, ghost).then(function (loadedPlugin) {
                            return recordLoadedPlugin(plugin, loadedPlugin);
                        });
                    }

                    // Install, then activate the plugin
                    return loader.installPluginByName(plugin, ghost).then(function () {
                        return loader.activatePluginByName(plugin, ghost);
                    }).then(function (loadedPlugin) {
                        return recordLoadedPlugin(plugin, loadedPlugin);
                    });
                });

            return when.all(loadPromises).then(function () {
                // Save our installed plugins to settings
                return saveInstalledPlugins(_.keys(loadedPlugins));
            }).then(function () {
                // Return the hash of all loaded plugins
                return when.resolve(loadedPlugins);
            });
        });
    }
};