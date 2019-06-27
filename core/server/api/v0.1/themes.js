// # Themes API
// RESTful API for Themes
const debug = require('ghost-ignition').debug('api:themes'),
    Promise = require('bluebird'),
    localUtils = require('./utils'),
    common = require('../../lib/common'),
    models = require('../../models'),
    settingsCache = require('../../services/settings/cache'),
    themeService = require('../../../frontend/services/themes'),
    themeList = themeService.list;

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
                return themeService.toJSON();
            });
    },

    activate(options) {
        let themeName = options.name,
            newSettings = [{
                key: 'active_theme',
                value: themeName
            }],
            loadedTheme,
            checkedTheme;

        return localUtils
        // Permissions
            .handlePermissions('themes', 'activate')(options)
            // Validation
            .then(() => {
                loadedTheme = themeList.get(themeName);

                if (!loadedTheme) {
                    return Promise.reject(new common.errors.ValidationError({
                        message: common.i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                        errorDetails: newSettings
                    }));
                }

                return themeService.validate.checkSafe(loadedTheme);
            })
            // Update setting
            .then((_checkedTheme) => {
                checkedTheme = _checkedTheme;
                // We use the model, not the API here, as we don't want to trigger permissions
                return models.Settings.edit(newSettings, options);
            })
            // Call activate
            .then(() => {
                // Activate! (sort of)
                debug('Activating theme (method B on API "activate")', themeName);
                themeService.activate(loadedTheme, checkedTheme);

                // Return JSON result
                return themeService.toJSON(themeName, checkedTheme);
            });
    },

    upload(options) {
        options = options || {};

        // consistent filename uploads
        options.originalname = options.originalname.toLowerCase();

        let zip = {
            path: options.path,
            name: options.originalname,
            shortName: themeService.storage.getSanitizedFileName(options.originalname.split('.zip')[0])
        };

        return localUtils
            // Permissions
            .handlePermissions('themes', 'add')(options)
            // Validation
            .then(() => {
                return themeService.settings.setFromZip(zip);
            })
            .then((theme) => {
                common.events.emit('theme.uploaded');
                return theme;
            });
    },

    download(options) {
        let themeName = options.name,
            theme = themeList.get(themeName);

        if (!theme) {
            return Promise.reject(new common.errors.BadRequestError({message: common.i18n.t('errors.api.themes.invalidThemeName')}));
        }

        return localUtils
        // Permissions
            .handlePermissions('themes', 'read')(options)
            .then(() => {
                return themeService.storage.serve({
                    name: themeName
                });
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
                return themeService.settings.destroy(themeName);
            });
    }
};

module.exports = themes;
