const _ = require('lodash');
const debug = require('ghost-ignition').debug('themes');
const common = require('../../../server/lib/common');
const themeLoader = require('./loader');
const active = require('./active');
const activate = require('./activate');
const validate = require('./validate');
const list = require('./list');
const settingsCache = require('../../../server/services/settings/cache');
const engineDefaults = require('./engines/defaults');

module.exports = {
    // Init themes module
    // TODO: move this once we're clear what needs to happen here
    init: function initThemes() {
        var activeThemeName = settingsCache.get('active_theme');

        debug('init themes', activeThemeName);

        // Register a listener for server-start to load all themes
        common.events.on('server.start', function readAllThemesOnServerStart() {
            themeLoader.loadAllThemes();
        });

        // Just read the active theme for now
        return themeLoader
            .loadOneTheme(activeThemeName)
            .then(function activeThemeHasLoaded(theme) {
                // Validate
                return validate
                    .check(theme)
                    .then(function validationSuccess(checkedTheme) {
                        if (!validate.canActivate(checkedTheme)) {
                            const checkError = new common.errors.ThemeValidationError({
                                message: common.i18n.t('errors.middleware.themehandler.invalidTheme', {theme: activeThemeName}),
                                errorDetails: Object.assign(
                                    _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                                        errors: checkedTheme.results.error
                                    }
                                )
                            });

                            common.logging.error(checkError);

                            activate(theme, checkedTheme, checkError);
                        } else {
                            // CASE: inform that the theme has errors, but not fatal (theme still works)
                            if (checkedTheme.results.error.length) {
                                common.logging.warn(new common.errors.ThemeValidationError({
                                    errorType: 'ThemeWorksButHasErrors',
                                    message: common.i18n.t('errors.middleware.themehandler.themeHasErrors', {theme: activeThemeName}),
                                    errorDetails: Object.assign(
                                        _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                                            errors: checkedTheme.results.error
                                        }
                                    )
                                }));
                            }

                            debug('Activating theme (method A on boot)', activeThemeName);

                            activate(theme, checkedTheme);
                        }
                    });
            })
            .catch(common.errors.NotFoundError, function (err) {
                // CASE: active theme is missing, we don't want to exit because the admin panel will still work
                err.message = common.i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeThemeName});
                common.logging.error(err);
            })
            .catch(function (err) {
                // CASE: theme threw an odd error, we don't want to exit because the admin panel will still work
                // This is the absolute catch-all, at this point, we do not know what went wrong!
                common.logging.error(err);
            });
    },
    getJSON: require('./to-json'),
    getActive: active.get,
    getApiVersion: function getApiVersion() {
        if (this.getActive()) {
            return this.getActive().engine('ghost-api');
        } else {
            return engineDefaults['ghost-api'];
        }
    },
    activate: function (themeName) {
        const loadedTheme = list.get(themeName);

        if (!loadedTheme) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
                errorDetails: themeName
            }));
        }

        return validate.checkSafe(loadedTheme)
            .then((checkedTheme) => {
                debug('Activating theme (method B on API "activate")', themeName);
                activate(loadedTheme, checkedTheme);

                return checkedTheme;
            });
    },
    storage: require('./storage'),
    middleware: require('./middleware')
};
