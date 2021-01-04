const _ = require('lodash');
const debug = require('ghost-ignition').debug('themes');
const {events} = require('../../../server/lib/common');
const {i18n: commonI18n} = require('../proxy');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const themeLoader = require('./loader');
const active = require('./active');
const activate = require('./activate');
const validate = require('./validate');
const i18n = require('./i18n');
const list = require('./list');
const settingsCache = require('../../../server/services/settings/cache');
const engineDefaults = require('./engines/defaults');

module.exports = {
    // Init themes module
    // TODO: move this once we're clear what needs to happen here
    init: function initThemes() {
        const activeThemeName = settingsCache.get('active_theme');

        i18n.init(activeThemeName);

        debug('init themes', activeThemeName);

        // Register a listener for server-start to load all themes
        events.on('server.start', function readAllThemesOnServerStart() {
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
                            const checkError = new errors.ThemeValidationError({
                                message: commonI18n.t('errors.middleware.themehandler.invalidTheme', {theme: activeThemeName}),
                                errorDetails: Object.assign(
                                    _.pick(checkedTheme, ['checkedVersion', 'name', 'path', 'version']), {
                                        errors: checkedTheme.results.error
                                    }
                                )
                            });

                            logging.error(checkError);

                            activate(theme, checkedTheme, checkError);
                        } else {
                            // CASE: inform that the theme has errors, but not fatal (theme still works)
                            if (checkedTheme.results.error.length) {
                                logging.warn(new errors.ThemeValidationError({
                                    errorType: 'ThemeWorksButHasErrors',
                                    message: commonI18n.t('errors.middleware.themehandler.themeHasErrors', {theme: activeThemeName}),
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
            .catch(errors.NotFoundError, function (err) {
                // CASE: active theme is missing, we don't want to exit because the admin panel will still work
                err.message = commonI18n.t('errors.middleware.themehandler.missingTheme', {theme: activeThemeName});
                logging.error(err);
            })
            .catch(function (err) {
                // CASE: theme threw an odd error, we don't want to exit because the admin panel will still work
                // This is the absolute catch-all, at this point, we do not know what went wrong!
                logging.error(err);
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
            return Promise.reject(new errors.ValidationError({
                message: commonI18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}),
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
    middleware: require('./middleware'),
    loadCoreHelpers: require('./handlebars/helpers').loadCoreHelpers
};
