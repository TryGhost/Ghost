const activate = require('./activate');
const themeLoader = require('./loader');
const storage = require('./storage');
const getJSON = require('./to-json');

const settingsCache = require('../../../shared/settings-cache');

module.exports = {
    /*
     * Load the currently active theme
     */
    init: async () => {
        const themeName = settingsCache.get('active_theme');

        return activate.loadAndActivate(themeName);
    },
    /**
     * Load all inactive themes
     */
    loadInactiveThemes: themeLoader.loadAllThemes,
    /**
     * Methods used in the API
     */
    api: {
        getJSON,
        activate: activate.activate,
        getZip: storage.getZip,
        setFromZip: storage.setFromZip,
        destroy: storage.destroy
    }
};
