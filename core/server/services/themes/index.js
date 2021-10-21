const activate = require('./activate');
const themeLoader = require('./loader');
const storage = require('./storage');
const getJSON = require('./to-json');
const installer = require('./installer');

const settingsCache = require('../../../shared/settings-cache');

// Needed for theme re-activation after customThemeSettings flag is toggled
// @TODO: remove when customThemeSettings flag is removed
const labs = require('../../../shared/labs');
const events = require('../../lib/common/events');
let _lastLabsValue;

module.exports = {
    /*
     * Load the currently active theme
     */
    init: async () => {
        const themeName = settingsCache.get('active_theme');

        /**
         * When customThemeSettings labs flag is toggled we need to re-validate and activate
         * the active theme so that it's settings are read and synced
         *
         * @TODO: remove when customThemeSettings labs flag is removed
         */
        _lastLabsValue = labs.isSet('customThemeSettings');
        events.on('settings.labs.edited', () => {
            if (labs.isSet('customThemeSettings') !== _lastLabsValue) {
                _lastLabsValue = labs.isSet('customThemeSettings');

                activate.activate(settingsCache.get('active_theme'));
            }
        });

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
        installFromGithub: installer.installFromGithub,
        destroy: storage.destroy
    }
};
