const {SUPPORTED_LOCALES} = require('./');

module.exports = {
    locales: SUPPORTED_LOCALES,

    keySeparator: false,
    namespaceSeparator: false,

    createOldCatalogs: false,
    indentation: 4,
    sort: true,

    failOnUpdate: process.env.CI,

    output: 'locales/$LOCALE.json'
};
