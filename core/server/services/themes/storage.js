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
const toJSON = require('./to-json');

const settingsCache = require('../../../shared/settings-cache');
const bridge = require('../../../bridge');

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
        const shortName = getStorage().getSanitizedFileName(zip.name.split('.zip')[0]);
        const backupName = `${shortName}_${ObjectID()}`;

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
            checkedTheme = await validate.checkSafe(zip, true);
            const themeExists = await getStorage().exists(shortName);
            // CASE: move the existing theme to a backup folder
            if (themeExists) {
                renamedExisting = true;
                await getStorage().rename(shortName, backupName);
            }

            // CASE: store extracted theme
            await getStorage().save({
                name: shortName,
                path: checkedTheme.path
            });
            // CASE: loads the theme from the fs & sets the theme on the themeList
            const loadedTheme = await themeLoader.loadOneTheme(shortName);
            overrideTheme = (shortName === settingsCache.get('active_theme'));
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
        } catch (error) {
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
