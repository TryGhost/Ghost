var debug = require('ghost-ignition').debug('themes'),
    common = require('../../lib/common'),
    themeLoader = require('./loader'),
    active = require('./active'),
    validate = require('./validate'),
    Storage = require('./Storage'),
    settingsCache = require('../settings/cache'),
    themeStorage;

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
                        // CASE: inform that the theme has errors, but not fatal (theme still works)
                        if (checkedTheme.results.error.length) {
                            common.logging.warn(new common.errors.ThemeValidationError({
                                errorType: 'ThemeWorksButHasErrors',
                                message: common.i18n.t('errors.middleware.themehandler.themeHasErrors', {theme: activeThemeName}),
                                errorDetails: JSON.stringify(checkedTheme.results.error, null, '\t')
                            }));
                        }

                        debug('Activating theme (method A on boot)', activeThemeName);
                        self.activate(theme, checkedTheme);
                    })
                    .catch(function validationFailure(err) {
                        if (err.errorDetails) {
                            common.logging.error(new common.errors.ThemeValidationError({
                                message: common.i18n.t('errors.middleware.themehandler.invalidTheme', {theme: activeThemeName}),
                                errorDetails: JSON.stringify(err.errorDetails, null, '\t')
                            }));
                        }

                        // CASE: we have to remember to show errors on blog
                        // `err.context` remembers the theme inside this property
                        self.activate(theme, err.context, err);
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
    activate: function activate(loadedTheme, checkedTheme, error) {
        // no need to check the score, activation should be used in combination with validate.check
        // Use the two theme objects to set the current active theme
        try {
            active.set(loadedTheme, checkedTheme, error);
            common.events.emit('services.themes.activated');
        } catch (err) {
            common.logging.error(new common.errors.InternalServerError({
                message: common.i18n.t('errors.middleware.themehandler.activateFailed', {theme: loadedTheme.name}),
                err: err
            }));
        }
    },
    middleware: require('./middleware')
};
