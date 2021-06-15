const _ = require('lodash');
const debug = require('@tryghost/debug')('themes');
const i18n = require('../../../shared/i18n');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const themeLoader = require('./loader');
const bridge = require('../../../bridge');
const validate = require('./validate');
const list = require('./list');
const settingsCache = require('../settings/cache');

module.exports = {
    // Init themes module
    // TODO: move this once we're clear what needs to happen here
    init: function initThemes() {
        const activeThemeName = settingsCache.get('active_theme');

        debug('init themes', activeThemeName);
        // Just read the active theme for now
        return themeLoader
            .loadOneTheme(activeThemeName)
            .then(function activeThemeHasLoaded(theme) {
                // Validate
                return validate
                    .check(theme)
                    .then(function validationSuccess(checkedTheme) {
                        if (!validate.canActivate(checkedTheme)) {
                            const checkError = new errors.ThemeValidationError({
                                message: i18n.t('errors.middleware.themehandler.invalidTheme', {theme: activeThemeName}),
                                errorDetails: Object.assign(
                                    _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                                        errors: checkedTheme.results.error
                                    }
                                )
                            });

                            logging.error(checkError);

                            bridge.activateTheme(theme, checkedTheme, checkError);
                        } else {
                            // CASE: inform that the theme has errors, but not fatal (theme still works)
                            if (checkedTheme.results.error.length) {
                                logging.warn(new errors.ThemeValidationError({
                                    errorType: 'ThemeWorksButHasErrors',
                                    message: i18n.t('errors.middleware.themehandler.themeHasErrors', {theme: activeThemeName}),
                                    errorDetails: Object.assign(
                                        _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                                            errors: checkedTheme.results.error
                                        }
                                    )
                                }));
                            }

                            debug('Activating theme (method A on boot)', activeThemeName);

                            bridge.activateTheme(theme, checkedTheme);
                        }
                    });
            })
            .catch(errors.NotFoundError, function (err) {
                // CASE: active theme is missing, we don't want to exit because the admin panel will still work
                err.message = i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeThemeName});
                logging.error(err);
            })
            .catch(function (err) {
                // CASE: theme threw an odd error, we don't want to exit because the admin panel will still work
                // This is the absolute catch-all, at this point, we do not know what went wrong!
                logging.error(err);
            });
    },
    getJSON: require('./to-json'),
    activate: function (themeName) {
        const loadedTheme = list.get(themeName);

        if (!loadedTheme) {
            return Promise.reject(new errors.ValidationError({
                message: i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                errorDetails: themeName
            }));
        }

        return validate.checkSafe(loadedTheme)
            .then((checkedTheme) => {
                debug('Activating theme (method B on API "activate")', themeName);
                bridge.activateTheme(loadedTheme, checkedTheme);

                return checkedTheme;
            });
    },
    storage: require('./storage'),
    /**
     * Load all inactive themes
     */
    loadInactiveThemes: async () => {
        return await themeLoader.loadAllThemes();
    }
};
