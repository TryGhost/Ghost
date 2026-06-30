const i18next = require('i18next');

// Locale data loaded from JSON (single source of truth)
const LOCALE_DATA = require('./locale-data.json');

// Export just the locale codes for backward compatibility
const SUPPORTED_LOCALES = LOCALE_DATA.map(locale => locale.code);

function generateResources(locales, ns) {
    return locales.reduce((acc, locale) => {
        let res;
        // add an extra fallback - this handles the case where we have a partial set of translations for some reason
        // by falling back to the english translations
        try {
            res = require(`../locales/${locale}/${ns}.json`);
        } catch (err) {
            res = require(`../locales/en/${ns}.json`);
        }

        // Note: due some random thing in TypeScript, 'requiring' a JSON file with a space in a key name, only adds it to the default export
        // If changing this behaviour, please also check the comments and signup-form apps in another language (mainly sentences with a space in them)
        acc[locale] = {
            [ns]: {...res, ...(res.default && typeof res.default === 'object' ? res.default : {})}
        };
        return acc;
    }, {});
}

function createI18n({generateThemeResources}) {
    return (lng = 'en', ns = 'portal', options = {}) => {
        const i18nextInstance = i18next.createInstance();
        const interpolation = {
            prefix: '{',
            suffix: '}'
        };
        if (ns === 'theme' || ns === 'portal') {
            interpolation.escapeValue = false;
        }
        let resources;
        if (ns !== 'theme') {
            resources = generateResources(SUPPORTED_LOCALES, ns);
        } else {
            resources = generateThemeResources(lng, options);
        }

        i18nextInstance.init({
            lng,

            // allow keys to be phrases having `:`, `.`
            nsSeparator: false,
            keySeparator: false,

            // if the value is an empty string, return the key
            returnEmptyString: false,

            // do not load a fallback
            fallbackLng: {
                no: ['nb', 'en'],
                default: ['en']
            },

            ns: ns,
            defaultNS: ns,

            // separators
            interpolation,

            resources
        });

        return i18nextInstance;
    };
}

module.exports = {
    createI18n,
    generateResources,
    LOCALE_DATA,
    SUPPORTED_LOCALES
};
