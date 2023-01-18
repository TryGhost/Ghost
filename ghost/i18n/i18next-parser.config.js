const {SUPPORTED_LOCALES} = require('./');

module.exports = {
    locales: SUPPORTED_LOCALES,

    keySeparator: false,
    namespaceSeparator: false,

    sort: true,

    output: 'locales/$LOCALE.json'
};
