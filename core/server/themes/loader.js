var debug = require('debug')('ghost:themes:loader'),
    config = require('../config'),
    events = require('../events'),
    read = require('./read'),
    settingsApi = require('../api/settings'),
    updateConfigAndCache,
    loadThemes,
    initThemes;

updateConfigAndCache = function updateConfigAndCache(themes) {
    debug('loading themes', themes);
    config.set('paths:availableThemes', themes);
    settingsApi.updateSettingsCache();
};

loadThemes = function loadThemes() {
    return read
        .all(config.getContentPath('themes'))
        .then(updateConfigAndCache);
};

initThemes = function initThemes() {
    debug('init themes', settingsApi.cache.get('activeTheme'));

    // Register a listener for server-start to load all themes
    events.on('server:start', function readAllThemesOnServerStart() {
        loadThemes();
    });

    // Just read the active theme for now
    return read
        .one(config.getContentPath('themes'), settingsApi.cache.get('activeTheme'))
        .then(updateConfigAndCache);
};

module.exports = {
    init: initThemes,
    load: loadThemes
};
