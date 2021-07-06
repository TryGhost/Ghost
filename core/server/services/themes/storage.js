const debug = require('@tryghost/debug')('themes');
const fs = require('fs-extra');

const bridge = require('../../../bridge');
const validate = require('./validate');
const list = require('./list');
const ThemeStorage = require('./ThemeStorage');
const themeLoader = require('./loader');
const toJSON = require('./to-json');

const settingsCache = require('../../../shared/settings-cache');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const ObjectID = require('bson-objectid');

const messages = {
    themeDoesNotExist: 'Theme does not exist.',
    invalidThemeName: 'Please select a valid theme.',
    overrideCasper: 'Please rename your zip, it\'s not allowed to override the default casper theme.',
    destroyCasper: 'Deleting the default casper theme is not allowed.',
    destroyActive: 'Deleting the active theme is not allowed.'
};

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
                message: tpl(messages.invalidThemeName)
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
                message: tpl(messages.overrideCasper)
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
                    bridge.activateTheme(loadedTheme, checkedTheme);
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
                message: tpl(messages.destroyCasper)
            });
        }

        if (themeName === settingsCache.get('active_theme')) {
            throw new errors.ValidationError({
                message: tpl(messages.destroyActive)
            });
        }

        const theme = list.get(themeName);

        if (!theme) {
            throw new errors.NotFoundError({
                message: tpl(messages.themeDoesNotExist)
            });
        }

        return getStorage().delete(themeName)
            .then(() => {
                list.del(themeName);
            });
    }
};
