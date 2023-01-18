const {SUPPORTED_LOCALES} = require('./');

module.exports = {
    locales: SUPPORTED_LOCALES,

    keySeparator: false,
    namespaceSeparator: false,

    createOldCatalogs: false,
    indentation: 4,
    sort: true,

    output: 'locales/$LOCALE.json'
};
