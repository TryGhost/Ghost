// # Themes API
// RESTful API for Themes
var debug = require('debug')('ghost:api:themes'),
    Promise = require('bluebird'),
    _ = require('lodash'),
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
        debug('browsing');
        var result = themeList.toAPI(themeList.getAll(), settingsCache.get('activeTheme'));
        debug('got result');
        return Promise.resolve({themes: result});
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
                // @TODO actually do things to activate the theme, other than just the setting?

                var themeResult = themeList.toAPI(loadedTheme, settingsCache.get('activeTheme'));
                // gscan theme structure !== ghost theme structure
                // @TODO consider a different way to build this result from the validations
                if (checkedTheme.results.warning.length > 0) {
                    themeResult[0].warnings = _.cloneDeep(checkedTheme.results.warning);
                }

                return {themes: themeResult};
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
                return themeUtils.loadOne(zip.shortName);
            })
            .then(function (loadedTheme) {
                var themeResult = themeList.toAPI(loadedTheme, settingsCache.get('activeTheme'));
                // gscan theme structure !== ghost theme structure
                // @TODO consider a different way to build this result from the validations
                if (checkedTheme.results.warning.length > 0) {
                    themeResult[0].warnings = _.cloneDeep(checkedTheme.results.warning);
                }

                return {themes: themeResult};
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
