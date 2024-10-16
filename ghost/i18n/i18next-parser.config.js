const {SUPPORTED_LOCALES} = require('./');

/**
 * @type {import('i18next-parser').UserConfig}
 */
module.exports = {
    locales: SUPPORTED_LOCALES,

    keySeparator: false,
    namespaceSeparator: false,

    defaultNamespace: process.env.NAMESPACE || 'translation',

    createOldCatalogs: false,
    indentation: 4,
    sort: true,

    failOnUpdate: process.env.CI,

    output: 'locales/$LOCALE/$NAMESPACE.json'
};
