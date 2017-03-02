var debug = require('debug')('ghost:themes:loader'),
    config = require('../config'),
    events = require('../events'),
    list = require('./list'),
    read = require('./read'),
    settingsCache = require('../settings/cache'),
    updateThemeList,
    loadAllThemes,
    loadOneTheme,
    initThemes;

updateThemeList = function updateThemeList(themes) {
    debug('loading themes', Object.keys(themes));
    list.init(themes);
};

loadAllThemes = function loadAllThemes() {
    return read
        .all(config.getContentPath('themes'))
        .then(updateThemeList);
};

loadOneTheme = function loadOneTheme(themeName) {
    return read
        .one(config.getContentPath('themes'), themeName)
        .then(function (readThemes) {
            // @TODO change read one to not return a keyed object
            return list.set(themeName, readThemes[themeName]);
        });
};

initThemes = function initThemes() {
    debug('init themes', settingsCache.get('activeTheme'));

    // Register a listener for server-start to load all themes
    events.on('server:start', function readAllThemesOnServerStart() {
        loadAllThemes();
    });

    // Just read the active theme for now
    return read
        .one(config.getContentPath('themes'), settingsCache.get('activeTheme'))
        .then(updateThemeList);
};

module.exports = {
    init: initThemes,
    loadAllThemes: loadAllThemes,
    loadOneTheme: loadOneTheme
};
