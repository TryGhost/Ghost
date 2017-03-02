var themeLoader = require('./loader');

// @TODO: reduce the amount of things we expose to the outside world
// Make this a nice clean sensible API we can all understand!
module.exports = {
    init: themeLoader.init,
    loadAll: themeLoader.loadAllThemes,
    loadOne: themeLoader.loadOneTheme,
    list: require('./list'),
    validate: require('./validate')
};
