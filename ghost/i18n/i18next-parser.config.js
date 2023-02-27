const {SUPPORTED_LOCALES} = require('./');

/**
 * @type {import('i18next-parser').UserConfig}
 */
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
