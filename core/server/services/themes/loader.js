var debug = require('ghost-ignition').debug('themes:loader'),
    config = require('../../config'),
    packageJSON = require('../../lib/fs/package-json'),
    themeList = require('./list'),
    loadAllThemes,
    loadOneTheme;

loadAllThemes = function loadAllThemes() {
    return packageJSON.read
        .all(config.getContentPath('themes'))
        .then(function updateThemeList(themes) {
            debug('loading themes', Object.keys(themes));

            themeList.init(themes);
        });
};

loadOneTheme = function loadOneTheme(themeName) {
    return packageJSON.read
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
