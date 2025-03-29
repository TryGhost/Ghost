const debug = require('@tryghost/debug')('themes');

const packageJSON = require('../../lib/package-json');
const config = require('../../../shared/config');
const themeList = require('./list');

const loadAllThemes = async function loadAllThemes() {
    const themes = await packageJSON.readPackages(config.getContentPath('themes'));
    debug('loading themes', Object.keys(themes));
    themeList.init(themes);
};

const loadOneTheme = async function loadOneTheme(themeName) {
    const theme = await packageJSON.readPackage(config.getContentPath('themes'), themeName);
    debug('loaded one theme', themeName);
    return themeList.set(themeName, theme[themeName]);
};

module.exports = {
    loadAllThemes: loadAllThemes,
    loadOneTheme: loadOneTheme
};
