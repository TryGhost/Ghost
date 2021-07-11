const debug = require('@tryghost/debug')('themes');
const fs = require('fs-extra');
const ObjectID = require('bson-objectid');

const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const validate = require('./validate');
const list = require('./list');
const ThemeStorage = require('./ThemeStorage');
const themeLoader = require('./loader');
const activator = require('./activation-bridge');
const toJSON = require('./to-json');

const settingsCache = require('../../../shared/settings-cache');

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
    getZip: async (themeName) => {
        const theme = list.get(themeName);

        if (!theme) {
            throw new errors.BadRequestError({
                message: tpl(messages.invalidThemeName)
            });
        }

        return await getStorage().serve({
            name: themeName
        });
    },
    setFromZip: async (zip) => {
        const themeName = getStorage().getSanitizedFileName(zip.name.split('.zip')[0]);
        const backupName = `${themeName}_${ObjectID()}`;

        // check if zip name is casper.zip
        if (zip.name === 'casper.zip') {
            throw new errors.ValidationError({
                message: tpl(messages.overrideCasper)
            });
        }

        let checkedTheme;
        let overrideTheme;
        let renamedExisting = false;

        try {
            checkedTheme = await validate.checkSafe(themeName, zip, true);
            const themeExists = await getStorage().exists(themeName);
            // CASE: move the existing theme to a backup folder
            if (themeExists) {
                debug('setFromZip Theme exists already');
                renamedExisting = true;
                await getStorage().rename(themeName, backupName);
            }

            // CASE: store extracted theme
            await getStorage().save({
                name: themeName,
                path: checkedTheme.path
            });

            // CASE: loads the theme from the fs & sets the theme on the themeList
            const loadedTheme = await themeLoader.loadOneTheme(themeName);
            overrideTheme = (themeName === settingsCache.get('active_theme'));

            // CASE: if this is the active theme, we are overriding
            if (overrideTheme) {
                debug('setFromZip Theme is active already');
                activator.activateFromAPIOverride(themeName, loadedTheme, checkedTheme);
            }

            // @TODO: unify the name across gscan and Ghost!
            return {
                themeOverridden: overrideTheme,
                theme: toJSON(themeName, checkedTheme)
            };
        } catch (error) {
            // restore backup if we renamed an existing theme but saving failed
            if (renamedExisting) {
                return getStorage().exists(themeName).then((themeExists) => {
                    if (!themeExists) {
                        return getStorage().rename(backupName, themeName).then(() => {
                            throw error;
                        });
                    }

                    throw error;
                });
            }

            throw error;
        } finally {
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
        }
    },
    destroy: async function (themeName) {
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

        let result = await getStorage().delete(themeName);
        list.del(themeName);
        return result;
    }
};
