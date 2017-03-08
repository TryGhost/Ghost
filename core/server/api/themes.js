// # Themes API
// RESTful API for Themes
var debug = require('debug')('ghost:api:themes'),
    Promise = require('bluebird'),
    fs = require('fs-extra'),
    config = require('../config'),
    errors = require('../errors'),
    events = require('../events'),
    logging = require('../logging'),
    storage = require('../storage'),
    apiUtils = require('./utils'),
    utils = require('./../utils'),
    i18n = require('../i18n'),
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
    browse: function browse() {
        return Promise.resolve(themeUtils.toJSON());
    },

    activate: function activate(options) {
        var themeName = options.name,
            newSettings = [{
                key: 'activeTheme',
                value: themeName
            }],
            loadedTheme,
            checkedTheme;

        return apiUtils
            .handlePermissions('themes', 'activate')(options)
            .then(function activateTheme() {
                loadedTheme = themeList.get(themeName);

                if (!loadedTheme) {
                    return Promise.reject(new errors.ValidationError({
                        message: i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                        context: 'activeTheme'
                    }));
                }

                return themeUtils.validate.check(loadedTheme);
            })
            .then(function haveValidTheme(_checkedTheme) {
                checkedTheme = _checkedTheme;
                // We use the model, not the API here, as we don't want to trigger permissions
                return settingsModel.edit(newSettings, options);
            })
            .then(function hasEditedSetting() {
                // Activate! (sort of)
                debug('Activating theme (method B on API "activate")', themeName);
                themeUtils.activate(loadedTheme, checkedTheme);

                return themeUtils.toJSON(themeName, checkedTheme);
            });
    },

    upload: function upload(options) {
        options = options || {};

        // consistent filename uploads
        options.originalname = options.originalname.toLowerCase();

        var storageAdapter = storage.getStorage('themes'),
            zip = {
                path: options.path,
                name: options.originalname,
                shortName: storageAdapter.getSanitizedFileName(options.originalname.split('.zip')[0])
            },
            checkedTheme;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError({message: i18n.t('errors.api.themes.overrideCasper')});
        }

        return apiUtils.handlePermissions('themes', 'add')(options)
            .then(function validateTheme() {
                return themeUtils.validate.check(zip, true);
            })
            .then(function checkExists(_checkedTheme) {
                checkedTheme = _checkedTheme;

                return storageAdapter.exists(utils.url.urlJoin(config.getContentPath('themes'), zip.shortName));
            })
            .then(function (themeExists) {
                // delete existing theme
                if (themeExists) {
                    return storageAdapter.delete(zip.shortName, config.getContentPath('themes'));
                }
            })
            .then(function () {
                events.emit('theme.uploaded', zip.shortName);
                // store extracted theme
                return storageAdapter.save({
                    name: zip.shortName,
                    path: checkedTheme.path
                }, config.getContentPath('themes'));
            })
            .then(function () {
                // Loads the theme from the filesystem
                // Sets the theme on the themeList
                return themeUtils.loadOne(zip.shortName);
            })
            .then(function (loadedTheme) {
                // If this is the active theme, we are overridding
                // This is a special case of activation
                if (zip.shortName === settingsCache.get('activeTheme')) {
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
                Promise.promisify(fs.removeSync)(zip.path)
                    .catch(function (err) {
                        logging.error(new errors.GhostError({err: err}));
                    });

                // @TODO we should probably do this as part of saving the theme
                // remove extracted dir from gscan
                // happens in background
                if (checkedTheme) {
                    Promise.promisify(fs.removeSync)(checkedTheme.path)
                        .catch(function (err) {
                            logging.error(new errors.GhostError({err: err}));
                        });
                }
            });
    },

    download: function download(options) {
        var themeName = options.name,
            theme = themeList.get(themeName),
            storageAdapter = storage.getStorage('themes');

        if (!theme) {
            return Promise.reject(new errors.BadRequestError({message: i18n.t('errors.api.themes.invalidRequest')}));
        }

        return apiUtils.handlePermissions('themes', 'read')(options)
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

        return apiUtils.handlePermissions('themes', 'destroy')(options)
            .then(function () {
                if (name === 'casper') {
                    throw new errors.ValidationError({message: i18n.t('errors.api.themes.destroyCasper')});
                }

                if (name === settingsCache.get('activeTheme')) {
                    throw new errors.ValidationError({message: i18n.t('errors.api.themes.destroyActive')});
                }

                theme = themeList.get(name);

                if (!theme) {
                    throw new errors.NotFoundError({message: i18n.t('errors.api.themes.themeDoesNotExist')});
                }

                return storageAdapter.delete(name, config.getContentPath('themes'));
            })
            .then(function () {
                themeList.del(name);
                events.emit('theme.deleted', name);
                // Delete returns an empty 204 response
            });
    }
};

module.exports = themes;
