var debug = require('debug')('ghost:themes'),
    events = require('../events'),
    themeLoader = require('./loader'),
    settingsCache = require('../settings/cache');

// @TODO: reduce the amount of things we expose to the outside world
// Make this a nice clean sensible API we can all understand!
module.exports = {
    // Init themes module
    // TODO: move this once we're clear what needs to happen here
    init: function initThemes() {
        var activeThemeName = settingsCache.get('activeTheme');
        debug('init themes', activeThemeName);

        // Register a listener for server-start to load all themes
        events.on('server:start', function readAllThemesOnServerStart() {
            themeLoader.loadAllThemes();
        });

        // Just read the active theme for now
        return themeLoader.loadOneTheme(activeThemeName);
    },
    // Load themes, soon to be removed and exposed via specific function.
    loadAll: themeLoader.loadAllThemes,
    loadOne: themeLoader.loadOneTheme,
    list: require('./list'),
    validate: require('./validate'),
    toJSON: require('./to-json')
};
