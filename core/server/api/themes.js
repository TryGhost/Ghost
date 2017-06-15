// # Themes API
// RESTful API for Themes
var Promise = require('bluebird'),
    _ = require('lodash'),
    gscan = require('gscan'),
    fs = require('fs-extra'),
    config = require('../config'),
    errors = require('../errors'),
    events = require('../events'),
    storage = require('../storage'),
    settings = require('./settings'),
    utils = require('./utils'),
    i18n = require('../i18n'),
    themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
    upload: function upload(options) {
        options = options || {};

        // consistent filename uploads
        options.originalname = options.originalname.toLowerCase();

        var storageAdapter = storage.getStorage('themes'),
        zip = {
            path: options.path,
            name: options.originalname,
            shortName: storageAdapter.getSanitizedFileName(options.originalname.split('.zip')[0])
        }, theme;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError(i18n.t('errors.api.themes.overrideCasper'));
        }

        return utils.handlePermissions('themes', 'add')(options)
            .then(function () {
                return gscan.checkZip(zip, {keepExtractedDir: true});
            })
            .then(function (_theme) {
                theme = _theme;
                theme = gscan.format(theme);

                if (!theme.results.error.length) {
                    return;
                }

                throw new errors.ThemeValidationError(
                    i18n.t('errors.api.themes.invalidTheme'),
                    theme.results.error
                );
            })
            .then(function () {
                return storageAdapter.exists(config.paths.themePath + '/' + zip.shortName);
            })
            .then(function (themeExists) {
                // delete existing theme
                if (themeExists) {
                    return storageAdapter.delete(zip.shortName, config.paths.themePath);
                }
            })
            .then(function () {
                events.emit('theme.uploaded', zip.shortName);
                // store extracted theme
                return storageAdapter.save({
                    name: zip.shortName,
                    path: theme.path
                }, config.paths.themePath);
            })
            .then(function () {
                // force reload of availableThemes
                // right now the logic is in the ConfigManager
                // if we create a theme collection, we don't have to read them from disk
                return config.loadThemes();
            })
            .then(function () {
                // the settings endpoint is used to fetch the availableThemes
                // so we have to force updating the in process cache
                return settings.updateSettingsCache();
            })
            .then(function (settings) {
                // gscan theme structure !== ghost theme structure
                var themeObject = _.find(settings.availableThemes.value, {name: zip.shortName}) || {};
                if (theme.results.warning.length > 0) {
                    themeObject.warnings = _.cloneDeep(theme.results.warning);
                }
                return {themes: [themeObject]};
            })
            .finally(function () {
                // remove zip upload from multer
                // happens in background
                Promise.promisify(fs.remove)(zip.path)
                    .catch(function (err) {
                        errors.logError(err);
                    });

                // remove extracted dir from gscan
                // happens in background
                if (theme) {
                    Promise.promisify(fs.remove)(theme.path)
                        .catch(function (err) {
                            errors.logError(err);
                        });
                }
            });
    },

    download: function download(options) {
        var themeName = options.name,
            theme = config.paths.availableThemes[themeName],
            storageAdapter = storage.getStorage('themes');

        if (!theme) {
            return Promise.reject(new errors.BadRequestError(i18n.t('errors.api.themes.invalidRequest')));
        }

        return utils.handlePermissions('themes', 'read')(options)
            .then(function () {
                events.emit('theme.downloaded', themeName);
                return storageAdapter.serve({isTheme: true, name: themeName});
            });
    },

    /**
     * remove theme zip
     * remove theme folder
     */
    destroy: function destroy(options) {
        var name = options.name,
            theme,
            storageAdapter = storage.getStorage('themes');

        return utils.handlePermissions('themes', 'destroy')(options)
            .then(function () {
                if (name === 'casper') {
                    throw new errors.ValidationError(i18n.t('errors.api.themes.destroyCasper'));
                }

                theme = config.paths.availableThemes[name];

                if (!theme) {
                    throw new errors.NotFoundError(i18n.t('errors.api.themes.themeDoesNotExist'));
                }

                events.emit('theme.deleted', name);
                return storageAdapter.delete(name, config.paths.themePath);
            })
            .then(function () {
                return config.loadThemes();
            })
            .then(function () {
                return settings.updateSettingsCache();
            });
    }
};

module.exports = themes;
