const routeSettings = require('./route-settings');
const SettingsLoader = require('./loader');
const ensureSettingsFile = require('./ensure-settings');

module.exports = {
    init: async () => {
        // Make sure that supported settings files are available
        // inside of the `content/setting` directory
        return ensureSettingsFile('routes.yaml');
    },

    loadRouteSettingsSync: SettingsLoader.loadSettingsSync,
    loadRouteSettings: SettingsLoader.loadSettings,
    getDefaultHash: routeSettings.getDefaultHash,
    /**
     * Methods used in the API
     */
    api: {
        setFromFilePath: routeSettings.setFromFilePath,
        get: routeSettings.get,
        getCurrentHash: routeSettings.getCurrentHash
    }
};
