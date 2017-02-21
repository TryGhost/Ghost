var debug = require('debug')('ghost:themes:loader'),
    config = require('../config'),
    events = require('../events'),
    list = require('./list'),
    read = require('./read'),
    settingsCache = require('../settings/cache'),
    updateThemeList,
    loadThemes,
    initThemes;

updateThemeList = function updateThemeList(themes) {
    debug('loading themes', Object.keys(themes));
    list.init(themes);
};

loadThemes = function loadThemes() {
    return read
        .all(config.getContentPath('themes'))
        .then(updateThemeList);
};

initThemes = function initThemes() {
    debug('init themes', settingsCache.get('activeTheme'));

    // Register a listener for server-start to load all themes
    events.on('server:start', function readAllThemesOnServerStart() {
        loadThemes();
    });

    // Just read the active theme for now
    return read
        .one(config.getContentPath('themes'), settingsCache.get('activeTheme'))
        .then(updateThemeList);
};

module.exports = {
    init: initThemes,
    load: loadThemes
};
