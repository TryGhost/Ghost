// # Themes API
// RESTful API for Themes
const localUtils = require('./utils'),
    common = require('../../lib/common'),
    models = require('../../models'),
    themeService = require('../../../frontend/services/themes');

let themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 */
themes = {
    /**
     * Every role can browse all themes. The response contains a list of all available themes in your content folder.
     * The active theme get's marked as `active:true` and contains an extra object `templates`, which
     * contains the custom templates of the active theme. These custom templates are used to show a dropdown
     * in the PSM to be able to choose a custom post template.
     */
    browse(options) {
        return localUtils
        // Permissions
            .handlePermissions('themes', 'browse')(options)
            // Main action
            .then(() => {
                // Return JSON result
                return themeService.getJSON();
            });
    },

    activate(options) {
        let themeName = options.name,
            newSettings = [{
                key: 'active_theme',
                value: themeName
            }];

        return localUtils
        // Permissions
            .handlePermissions('themes', 'activate')(options)
            // Validation & activation
            .then(() => {
                return themeService.activate(themeName);
            })
            // Update setting
            .then((checkedTheme) => {
                // @NOTE: We use the model, not the API here, as we don't want to trigger permissions
                return models.Settings.edit(newSettings, options)
                    .then(() => checkedTheme);
            })
            .then((checkedTheme) => {
                // Return JSON result
                return themeService.getJSON(themeName, checkedTheme);
            });
    },

    upload(options) {
        options = options || {};

        // consistent filename uploads
        options.originalname = options.originalname.toLowerCase();

        let zip = {
            path: options.path,
            name: options.originalname
        };

        return localUtils
            // Permissions
            .handlePermissions('themes', 'add')(options)
            // Validation
            .then(() => {
                return themeService.storage.setFromZip(zip);
            })
            .then(({theme}) => {
                common.events.emit('theme.uploaded');
                return theme;
            });
    },

    download(options) {
        let themeName = options.name;

        return localUtils
        // Permissions
            .handlePermissions('themes', 'read')(options)
            .then(() => {
                return themeService.storage.getZip(themeName);
            });
    },

    /**
     * remove theme zip
     * remove theme folder
     */
    destroy(options) {
        let themeName = options.name;

        return localUtils
        // Permissions
            .handlePermissions('themes', 'destroy')(options)
            // Validation
            .then(() => {
                return themeService.storage.destroy(themeName);
            });
    }
};

module.exports = themes;
