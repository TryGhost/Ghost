var debug = require('ghost-ignition').debug('themes:loader'),
    config = require('../config'),
    themeList = require('./list'),
    read = require('../utils/packages').read,
    loadAllThemes,
    loadOneTheme;

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
            return themeList.set(themeName, readThemes[themeName]);
        });
};

module.exports = {
    loadAllThemes: loadAllThemes,
    loadOneTheme: loadOneTheme
};
