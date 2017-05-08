var debug = require('debug')('ghost:themes'),
    _ = require('lodash'),
    events = require('../events'),
    errors = require('../errors'),
    logging = require('../logging'),
    i18n = require('../i18n'),
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
        events.on('server:start', function readAllThemesOnServerStart() {
            themeLoader.loadAllThemes();
        });

        // Just read the active theme for now
        return themeLoader
            .loadOneTheme(activeThemeName)
            .then(function activeThemeHasLoaded(theme) {
                // Validate
                return validate
                    .check(theme)
                    .then(function resultHandler(checkedTheme) {
                        // Activate! (sort of)
                        debug('Activating theme (method A on boot)', activeThemeName);
                        self.activate(theme, checkedTheme);
                    })
                    .catch(function (err) {
                        // Active theme is not valid, we don't want to exit because the admin panel will still work
                        logging.error(new errors.InternalServerError({
                            message: i18n.t('errors.middleware.themehandler.invalidTheme', {theme: activeThemeName}),
                            err: err
                        }));
                    });
            })
            .catch(function () {
                // Active theme is missing, we don't want to exit because the admin panel will still work
                logging.warn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeThemeName}));
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
    activate: function activate(loadedTheme, checkedTheme) {
        if (!_.has(checkedTheme, 'results.score.level') || checkedTheme.results.score.level !== 'passing') {
            throw new errors.InternalServerError({
                message: i18n.t('errors.middleware.themehandler.invalidTheme', {theme: loadedTheme.name})
            });
        }

        // Use the two theme objects to set the current active theme
        active.set(loadedTheme, checkedTheme);
    },
    middleware: require('./middleware')
};
