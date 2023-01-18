const i18next = require('i18next');

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

        resources: {
            en: require('../locales/en.js'),
            nl: require('../locales/nl.js')
        }
    });

    return i18nextInstance;
};
