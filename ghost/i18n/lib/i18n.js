const i18next = require('i18next');

const RESOURCES = {
    en: {
        translation: require('../locales/en.json')
    },
    nl: {
        translation: require('../locales/nl.json')
    }
};

const SUPPORTED_LOCALES = Object.keys(RESOURCES);

module.exports = (lng = 'en') => {
    const i18nextInstance = i18next.createInstance();
    i18nextInstance.init({
        lng,
        debug: process.env.NODE_ENV === 'development',

        // allow keys to be phrases having `:`, `.`
        nsSeparator: false,
        keySeparator: false,

        // do not load a fallback
        fallbackLng: false,

        resources: RESOURCES
    });

    return i18nextInstance;
};

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
