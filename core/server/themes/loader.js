var debug = require('debug')('ghost:themes:loader'),
    config = require('../config'),
    events = require('../events'),
    themeList = require('./list'),
    read = require('./read'),
    settingsCache = require('../settings/cache'),
    loadAllThemes,
    loadOneTheme,
    initThemes;

loadAllThemes = function loadAllThemes() {
    return read
        .all(config.getContentPath('themes'))
        .then(function updateThemeList(themes) {
            debug('loading themes', Object.keys(themes));

            themeList.init(themes);
        });
};

loadOneTheme = function loadOneTheme(themeName) {
    return read
        .one(config.getContentPath('themes'), themeName)
        .then(function (readThemes) {
            debug('loaded one theme', themeName);
            // @TODO change read one to not return a keyed object
            return themeList.set(themeName, readThemes[themeName]);
        });
};

initThemes = function initThemes() {
    var activeThemeName = settingsCache.get('activeTheme');
    debug('init themes', activeThemeName);

    // Register a listener for server-start to load all themes
    events.on('server:start', function readAllThemesOnServerStart() {
        loadAllThemes();
    });

    // Just read the active theme for now
    return loadOneTheme(activeThemeName);
};

module.exports = {
    init: initThemes,
    loadAllThemes: loadAllThemes,
    loadOneTheme: loadOneTheme
};
