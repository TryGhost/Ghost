// # Themes API
// RESTful API for Themes
var debug = require('debug')('ghost:api:themes'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    gscan = require('gscan'),
    fs = require('fs-extra'),
    config = require('../config'),
    errors = require('../errors'),
    events = require('../events'),
    logging = require('../logging'),
    storage = require('../storage'),
    apiUtils = require('./utils'),
    utils = require('./../utils'),
    i18n = require('../i18n'),
    themeUtils = require('../themes'),
    themeList = themeUtils.list,
    packageUtils = require('../utils/packages'),
    themes;

/**
 * ## Themes API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
themes = {
    browse: function browse() {
        debug('browsing');
        var result = packageUtils.filterPackages(themeList.getAll());
        debug('got result');
        return Promise.resolve({themes: result});
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
            }, theme;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError({message: i18n.t('errors.api.themes.overrideCasper')});
        }

        return apiUtils.handlePermissions('themes', 'add')(options)
            .then(function () {
                return gscan.checkZip(zip, {keepExtractedDir: true});
            })
            .then(function (_theme) {
                theme = _theme;
                theme = gscan.format(theme);

                if (!theme.results.error.length) {
                    return;
                }

                throw new errors.ThemeValidationError({
                    message: i18n.t('errors.api.themes.invalidTheme'),
                    errorDetails: theme.results.error
                });
            })
            .then(function () {
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
                    path: theme.path
                }, config.getContentPath('themes'));
            })
            .then(function () {
                return themeUtils.loadOne(zip.shortName);
            })
            .then(function (themeObject) {
                // @TODO fix this craziness
                var toFilter = {};
                toFilter[zip.shortName] = themeObject;
                themeObject = packageUtils.filterPackages(toFilter);
                // gscan theme structure !== ghost theme structure
                if (theme.results.warning.length > 0) {
                    themeObject.warnings = _.cloneDeep(theme.results.warning);
                }
                return {themes: themeObject};
            })
            .finally(function () {
                // remove zip upload from multer
                // happens in background
                Promise.promisify(fs.removeSync)(zip.path)
                    .catch(function (err) {
                        logging.error(new errors.GhostError({err: err}));
                    });

                // remove extracted dir from gscan
                // happens in background
                if (theme) {
                    Promise.promisify(fs.removeSync)(theme.path)
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

                theme = themeList.get(name);

                if (!theme) {
                    throw new errors.NotFoundError({message: i18n.t('errors.api.themes.themeDoesNotExist')});
                }

                return storageAdapter.delete(name, config.getContentPath('themes'));
            })
            .then(function () {
                themeList.del(name);
                events.emit('theme.deleted', name);
            });
    }
};

module.exports = themes;
