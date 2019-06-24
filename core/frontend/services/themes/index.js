const _ = require('lodash');
const debug = require('ghost-ignition').debug('themes');
const common = require('../../../server/lib/common');
const themeLoader = require('./loader');
const active = require('./active');
const validate = require('./validate');
const Storage = require('./Storage');
const settingsCache = require('../../../server/services/settings/cache');
const engineDefaults = require('./engines/defaults');

let themeStorage;

// @TODO: reduce the amount of things we expose to the outside world
// Make this a nice clean sensible API we can all understand!
module.exports = {
    // Init themes module
    // TODO: move this once we're clear what needs to happen here
    init: function initThemes() {
        var activeThemeName = settingsCache.get('active_theme'),
            self = this;

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

                            self.activate(theme, checkedTheme, checkError);
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

                            self.activate(theme, checkedTheme);
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
    // Load themes, soon to be removed and exposed via specific function.
    loadAll: themeLoader.loadAllThemes,
    loadOne: themeLoader.loadOneTheme,
    get storage() {
        themeStorage = themeStorage || new Storage();

        return themeStorage;
    },
    list: require('./list'),
    validate: validate,
    toJSON: require('./to-json'),
    getActive: active.get,
    getApiVersion: function getApiVersion() {
        if (this.getActive()) {
            return this.getActive().engine('ghost-api');
        } else {
            return engineDefaults['ghost-api'];
        }
    },
    activate: function activate(loadedTheme, checkedTheme, error) {
        // no need to check the score, activation should be used in combination with validate.check
        // Use the two theme objects to set the current active theme
        try {
            let previousGhostAPI;

            if (this.getActive()) {
                previousGhostAPI = this.getApiVersion();
            }

            active.set(loadedTheme, checkedTheme, error);
            const currentGhostAPI = this.getApiVersion();

            common.events.emit('services.themes.activated');

            if (previousGhostAPI !== undefined && (previousGhostAPI !== currentGhostAPI)) {
                common.events.emit('services.themes.api.changed');
                const siteApp = require('../../../server/web/site/app');
                siteApp.reload();
            }
        } catch (err) {
            common.logging.error(new common.errors.InternalServerError({
                message: common.i18n.t('errors.middleware.themehandler.activateFailed', {theme: loadedTheme.name}),
                err: err
            }));
        }
    },
    middleware: require('./middleware')
};
