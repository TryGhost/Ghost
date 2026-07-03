const {createI18n, generateResources, LOCALE_DATA, SUPPORTED_LOCALES} = require('./i18n-core');

function generateThemeResources(lng) {
    return {
        [lng]: {
            theme: {}
        }
    };
}

const i18n = createI18n({generateThemeResources});

module.exports = i18n;
module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
module.exports.LOCALE_DATA = LOCALE_DATA;
module.exports.generateResources = generateResources;
