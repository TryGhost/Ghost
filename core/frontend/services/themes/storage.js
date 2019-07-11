const fs = require('fs-extra');

const activate = require('./activate');
const validate = require('./validate');
const list = require('./list');
const ThemeStorage = require('./ThemeStorage');
const themeLoader = require('./loader');
const toJSON = require('./to-json');

const settingsCache = require('../../../server/services/settings/cache');
const common = require('../../../server/lib/common');
const debug = require('ghost-ignition').debug('api:themes');

let themeStorage;

const getStorage = () => {
    themeStorage = themeStorage || new ThemeStorage();

    return themeStorage;
};

module.exports = {
    getZip: (themeName) => {
        const theme = list.get(themeName);

        if (!theme) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.themes.invalidThemeName')
            }));
        }

        return getStorage().serve({
            name: themeName
        });
    },
    setFromZip: (zip) => {
        const shortName = getStorage().getSanitizedFileName(zip.name.split('.zip')[0]);

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.api.themes.overrideCasper')
            });
        }

        let checkedTheme;

        return validate.checkSafe(zip, true)
            .then((_checkedTheme) => {
                checkedTheme = _checkedTheme;

                return getStorage().exists(shortName);
            })
            .then((themeExists) => {
                // CASE: delete existing theme
                if (themeExists) {
                    return getStorage().delete(shortName);
                }
            })
            .then(() => {
                // CASE: store extracted theme
                return getStorage().save({
                    name: shortName,
                    path: checkedTheme.path
                });
            })
            .then(() => {
                // CASE: loads the theme from the fs & sets the theme on the themeList
                return themeLoader.loadOneTheme(shortName);
            })
            .then((loadedTheme) => {
                const overrideTheme = (shortName === settingsCache.get('active_theme'));
                // CASE: if this is the active theme, we are overriding
                if (overrideTheme) {
                    debug('Activating theme (method C, on API "override")', shortName);
                    activate(loadedTheme, checkedTheme);
                }

                // @TODO: unify the name across gscan and Ghost!
                return {
                    themeOverridden: overrideTheme,
                    theme: toJSON(shortName, checkedTheme)
                };
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
    },
    destroy: function (themeName) {
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

        const theme = list.get(themeName);

        if (!theme) {
            throw new common.errors.NotFoundError({
                message: common.i18n.t('errors.api.themes.themeDoesNotExist')
            });
        }

        return getStorage().delete(themeName)
            .then(() => {
                list.del(themeName);
            });
    }
};
