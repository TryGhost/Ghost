var themeLoader = require('./loader');

module.exports = {
    init: themeLoader.init,
    loadAll: themeLoader.loadAllThemes,
    loadOne: themeLoader.loadOneTheme,
    list: require('./list'),
    validate: require('./validate')
};
