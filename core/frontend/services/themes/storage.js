const fs = require('fs-extra');

const activate = require('./activate');
const validate = require('./validate');
const list = require('./list');
const ThemeStorage = require('./ThemeStorage');
const themeLoader = require('./loader');
const toJSON = require('./to-json');

const settingsCache = require('../../../server/services/settings/cache');
const {i18n} = require('../proxy');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('api:themes');
const ObjectID = require('bson-objectid');

let themeStorage;

const getStorage = () => {
    themeStorage = themeStorage || new ThemeStorage();

    return themeStorage;
};

module.exports = {
    getZip: (themeName) => {
        const theme = list.get(themeName);

        if (!theme) {
            return Promise.reject(new errors.BadRequestError({
                message: i18n.t('errors.api.themes.invalidThemeName')
            }));
        }

        return getStorage().serve({
            name: themeName
        });
    },
    setFromZip: (zip) => {
        const shortName = getStorage().getSanitizedFileName(zip.name.split('.zip')[0]);
        const backupName = `${shortName}_${ObjectID()}`;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError({
                message: i18n.t('errors.api.themes.overrideCasper')
            });
        }

        let checkedTheme;
        let renamedExisting = false;

        return validate.checkSafe(zip, true)
            .then((_checkedTheme) => {
                checkedTheme = _checkedTheme;

                return getStorage().exists(shortName);
            })
            .then((themeExists) => {
                // CASE: move the existing theme to a backup folder
                if (themeExists) {
                    renamedExisting = true;
                    return getStorage().rename(shortName, backupName);
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
            .catch((error) => {
                // restore backup if we renamed an existing theme but saving failed
                if (renamedExisting) {
                    return getStorage().exists(shortName).then((themeExists) => {
                        if (!themeExists) {
                            return getStorage().rename(backupName, shortName).then(() => {
                                throw error;
                            });
                        }
                    });
                }

                throw error;
            })
            .finally(() => {
                // @TODO: we should probably do this as part of saving the theme
                // CASE: remove extracted dir from gscan happens in background
                if (checkedTheme) {
                    fs.remove(checkedTheme.path)
                        .catch((err) => {
                            logging.error(new errors.GhostError({err: err}));
                        });
                }

                // CASE: remove the backup we created earlier
                getStorage()
                    .delete(backupName)
                    .catch((err) => {
                        logging.error(new errors.GhostError({err: err}));
                    });
            });
    },
    destroy: function (themeName) {
        if (themeName === 'casper') {
            throw new errors.ValidationError({
                message: i18n.t('errors.api.themes.destroyCasper')
            });
        }

        if (themeName === settingsCache.get('active_theme')) {
            throw new errors.ValidationError({
                message: i18n.t('errors.api.themes.destroyActive')
            });
        }

        const theme = list.get(themeName);

        if (!theme) {
            throw new errors.NotFoundError({
                message: i18n.t('errors.api.themes.themeDoesNotExist')
            });
        }

        return getStorage().delete(themeName)
            .then(() => {
                list.del(themeName);
            });
    }
};
