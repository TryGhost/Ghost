const Promise = require('bluebird');
const fs = require('fs-extra');
const debug = require('ghost-ignition').debug('api:themes');
const common = require('../../lib/common');
const themeService = require('../../services/themes');
const settingsCache = require('../../services/settings/cache');
const models = require('../../models');

module.exports = {
    docName: 'themes',

    browse: {
        permissions: true,
        query() {
            return themeService.toJSON();
        }
    },

    activate: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            let themeName = frame.options.name;
            let checkedTheme;

            const newSettings = [{
                key: 'active_theme',
                value: themeName
            }];

            const loadedTheme = themeService.list.get(themeName);

            if (!loadedTheme) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                    context: 'active_theme'
                }));
            }

            return themeService.validate.check(loadedTheme)
                .then((_checkedTheme) => {
                    checkedTheme = _checkedTheme;

                    // @NOTE: we use the model, not the API here, as we don't want to trigger permissions
                    return models.Settings.edit(newSettings, frame.options);
                })
                .then(() => {
                    debug('Activating theme (method B on API "activate")', themeName);
                    themeService.activate(loadedTheme, checkedTheme);

                    return themeService.toJSON(themeName, checkedTheme);
                });
        }
    },

    upload: {
        headers: {},
        permissions: {
            method: 'add'
        },
        query(frame) {
            // @NOTE: consistent filename uploads
            frame.options.originalname = frame.file.originalname.toLowerCase();

            let zip = {
                path: frame.file.path,
                name: frame.file.originalname,
                shortName: themeService.storage.getSanitizedFileName(frame.file.originalname.split('.zip')[0])
            };

            let checkedTheme;

            // check if zip name is casper.zip
            if (zip.name === 'casper.zip') {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.themes.overrideCasper')
                });
            }

            return themeService.validate.check(zip, true)
                .then((_checkedTheme) => {
                    checkedTheme = _checkedTheme;

                    return themeService.storage.exists(zip.shortName);
                })
                .then((themeExists) => {
                    // CASE: delete existing theme
                    if (themeExists) {
                        return themeService.storage.delete(zip.shortName);
                    }
                })
                .then(() => {
                    // CASE: store extracted theme
                    return themeService.storage.save({
                        name: zip.shortName,
                        path: checkedTheme.path
                    });
                })
                .then(() => {
                    // CASE: loads the theme from the fs & sets the theme on the themeList
                    return themeService.loadOne(zip.shortName);
                })
                .then((loadedTheme) => {
                    // CASE: if this is the active theme, we are overriding
                    if (zip.shortName === settingsCache.get('active_theme')) {
                        debug('Activating theme (method C, on API "override")', zip.shortName);
                        themeService.activate(loadedTheme, checkedTheme);

                        // CASE: clear cache
                        this.headers.cacheInvalidate = true;
                    }

                    common.events.emit('theme.uploaded');

                    // @TODO: unify the name across gscan and Ghost!
                    return themeService.toJSON(zip.shortName, checkedTheme);
                })
                .finally(() => {
                    // @TODO: we should probably do this as part of saving the theme
                    // CASE: remove extracted dir from gscan
                    // happens in background
                    if (checkedTheme) {
                        fs.remove(checkedTheme.path)
                            .catch((err) => {
                                common.logging.error(new common.errors.GhostError({err: err}));
                            });
                    }
                });
        }
    },

    download: {
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'read'
        },
        query(frame) {
            let themeName = frame.options.name;
            const theme = themeService.list.get(themeName);

            if (!theme) {
                return Promise.reject(new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.themes.invalidThemeName')
                }));
            }

            return themeService.storage.serve({
                name: themeName
            });
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            let themeName = frame.options.name;

            if (themeName === 'casper') {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.themes.destroyCasper')
                });
            }

            if (themeName === settingsCache.get('active_theme')) {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.themes.destroyActive')
                });
            }

            const theme = themeService.list.get(themeName);

            if (!theme) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.themes.themeDoesNotExist')
                });
            }

            return themeService.storage.delete(themeName)
                .then(() => {
                    themeService.list.del(themeName);
                });
        }
    }
};
