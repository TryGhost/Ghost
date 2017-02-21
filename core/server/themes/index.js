var themeLoader = require('./loader');

module.exports = {
    init: themeLoader.init,
    load: themeLoader.load,
    list: require('./list'),
    validate: require('./validate')
};
