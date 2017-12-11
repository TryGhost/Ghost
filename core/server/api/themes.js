// # Themes API
// RESTful API for Themes
var debug = require('ghost-ignition').debug('api:themes'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    apiUtils = require('./utils'),
    common = require('../lib/common'),
    settingsModel = require('../models/settings').Settings,
    settingsCache = require('../settings/cache'),
    themeUtils = require('../themes'),
    themeList = themeUtils.list,
    themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
    /**
     * Every role can browse all themes. The response contains a list of all available themes in your content folder.
     * The active theme get's marked as `active:true` and contains an extra object `templates`, which
     * contains the custom templates of the active theme. These custom templates are used to show a dropdown
     * in the PSM to be able to choose a custom post template.
     */
    browse: function browse(options) {
        return apiUtils
        // Permissions
            .handlePermissions('themes', 'browse')(options)
            // Main action
            .then(function makeApiResult() {
                // Return JSON result
                return themeUtils.toJSON();
            });
    },

    activate: function activate(options) {
        var themeName = options.name,
            newSettings = [{
                key: 'active_theme',
                value: themeName
            }],
            loadedTheme,
            checkedTheme;

        return apiUtils
        // Permissions
            .handlePermissions('themes', 'activate')(options)
            // Validation
            .then(function validateTheme() {
                loadedTheme = themeList.get(themeName);

                if (!loadedTheme) {
                    return Promise.reject(new common.errors.ValidationError({
                        message: common.i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                        context: 'active_theme'
                    }));
                }

                return themeUtils.validate.check(loadedTheme);
            })
            // Update setting
            .then(function changeActiveThemeSetting(_checkedTheme) {
                checkedTheme = _checkedTheme;
                // We use the model, not the API here, as we don't want to trigger permissions
                return settingsModel.edit(newSettings, options);
            })
            // Call activate
            .then(function hasEditedSetting() {
                // Activate! (sort of)
                debug('Activating theme (method B on API "activate")', themeName);
                themeUtils.activate(loadedTheme, checkedTheme);

                // Return JSON result
                return themeUtils.toJSON(themeName, checkedTheme);
            });
    },

    upload: function upload(options) {
        options = options || {};

        // consistent filename uploads
        options.originalname = options.originalname.toLowerCase();

        var zip = {
                path: options.path,
                name: options.originalname,
                shortName: themeUtils.storage.getSanitizedFileName(options.originalname.split('.zip')[0])
            },
            checkedTheme;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new common.errors.ValidationError({message: common.i18n.t('errors.api.themes.overrideCasper')});
        }

        return apiUtils
        // Permissions
            .handlePermissions('themes', 'add')(options)
            // Validation
            .then(function validateTheme() {
                return themeUtils.validate.check(zip, true);
            })
            // More validation (existence check)
            .then(function checkExists(_checkedTheme) {
                checkedTheme = _checkedTheme;

                return themeUtils.storage.exists(zip.shortName);
            })
            // If the theme existed we need to delete it
            .then(function removeOldTheme(themeExists) {
                // delete existing theme
                if (themeExists) {
                    return themeUtils.storage.delete(zip.shortName);
                }
            })
            .then(function storeNewTheme() {
                common.events.emit('theme.uploaded', zip.shortName);
                // store extracted theme
                return themeUtils.storage.save({
                    name: zip.shortName,
                    path: checkedTheme.path
                });
            })
            .then(function loadNewTheme() {
                // Loads the theme from the filesystem
                // Sets the theme on the themeList
                return themeUtils.loadOne(zip.shortName);
            })
            .then(function activateAndReturn(loadedTheme) {
                // If this is the active theme, we are overriding
                // This is a special case of activation
                if (zip.shortName === settingsCache.get('active_theme')) {
                    // Activate! (sort of)
                    debug('Activating theme (method C, on API "override")', zip.shortName);
                    themeUtils.activate(loadedTheme, checkedTheme);
                }

                // @TODO: unify the name across gscan and Ghost!
                return themeUtils.toJSON(zip.shortName, checkedTheme);
            })
            .finally(function () {
                // @TODO we should probably do this as part of saving the theme
                // remove zip upload from multer
                // happens in background
                Promise.promisify(fs.remove)(zip.path)
                    .catch(function (err) {
                        common.logging.error(new common.errors.GhostError({err: err}));
                    });

                // @TODO we should probably do this as part of saving the theme
                // remove extracted dir from gscan
                // happens in background
                if (checkedTheme) {
                    Promise.promisify(fs.remove)(checkedTheme.path)
                        .catch(function (err) {
                            common.logging.error(new common.errors.GhostError({err: err}));
                        });
                }
            });
    },

    download: function download(options) {
        var themeName = options.name,
            theme = themeList.get(themeName);

        if (!theme) {
            return Promise.reject(new common.errors.BadRequestError({message: common.i18n.t('errors.api.themes.invalidRequest')}));
        }

        return apiUtils
        // Permissions
            .handlePermissions('themes', 'read')(options)
            .then(function sendTheme() {
                common.events.emit('theme.downloaded', themeName);
                return themeUtils.storage.serve({
                    name: themeName
                });
            });
    },

    /**
     * remove theme zip
     * remove theme folder
     */
    destroy: function destroy(options) {
        var themeName = options.name,
            theme;

        return apiUtils
        // Permissions
            .handlePermissions('themes', 'destroy')(options)
            // Validation
            .then(function validateTheme() {
                if (themeName === 'casper') {
                    throw new common.errors.ValidationError({message: common.i18n.t('errors.api.themes.destroyCasper')});
                }

                if (themeName === settingsCache.get('active_theme')) {
                    throw new common.errors.ValidationError({message: common.i18n.t('errors.api.themes.destroyActive')});
                }

                theme = themeList.get(themeName);

                if (!theme) {
                    throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.themes.themeDoesNotExist')});
                }

                // Actually do the deletion here
                return themeUtils.storage.delete(themeName);
            })
            // And some extra stuff to maintain state here
            .then(function deleteTheme() {
                themeList.del(themeName);
                common.events.emit('theme.deleted', themeName);
                // Delete returns an empty 204 response
            });
    }
};

module.exports = themes;
