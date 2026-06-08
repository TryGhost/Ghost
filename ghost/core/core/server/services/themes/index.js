const activate = require('./activate');
const themeLoader = require('./loader');
const storage = require('./storage');
const getJSON = require('./to-json');
const installer = require('./installer');
const validate = require('./validate');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');

module.exports = {
    /*
     * Load the currently active theme
     */
    init: async () => {
        validate.init();

        const skipChecks = config.get('optimization:themes:skipBootChecks') || false;

        const themeName = settingsCache.get('active_theme');
        return activate.loadAndActivate(themeName, {skipChecks});
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
        getThemeErrors: validate.getThemeErrors,
        getZip: storage.getZip,
        setFromZip: storage.setFromZip,
        installFromGithub: installer.installFromGithub,
        destroy: storage.destroy
    }
};
