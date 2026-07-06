const {createI18n, createGenerateResources, LOCALE_DATA, SUPPORTED_LOCALES} = require('./i18n-core');
const {requireLoader} = require('./require-loader');

const generateResources = createGenerateResources(requireLoader);

function generateThemeResources(lng) {
    return {
        [lng]: {
            theme: {}
        }
    };
}

const i18n = createI18n({generateResources, generateThemeResources});

module.exports = i18n;
module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
module.exports.LOCALE_DATA = LOCALE_DATA;
module.exports.generateResources = generateResources;
