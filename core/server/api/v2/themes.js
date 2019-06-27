const Promise = require('bluebird');
const debug = require('ghost-ignition').debug('api:themes');
const common = require('../../lib/common');
const themeService = require('../../../frontend/services/themes');
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
                    errorDetails: newSettings
                }));
            }

            return themeService.validate.checkSafe(loadedTheme)
                .then((_checkedTheme) => {
                    checkedTheme = _checkedTheme;
                    debug('Activating theme (method B on API "activate")', themeName);
                    themeService.activate(loadedTheme, checkedTheme);

                    // @NOTE: we use the model, not the API here, as we don't want to trigger permissions
                    return models.Settings.edit(newSettings, frame.options);
                })
                .then(() => {
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

            return themeService.settings.setFromZip(zip)
                .then((theme) => {
                    common.events.emit('theme.uploaded');
                    return theme;
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

            return themeService.settings.destroy(themeName);
        }
    }
};
