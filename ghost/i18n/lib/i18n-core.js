// CJS (Node) core for @tryghost/i18n.
//
// Sibling of ./i18n-core.mjs (the ESM/browser twin). Ghost core require()s this
// package synchronously, so the Node path must stay CommonJS; the browser path
// must be pure ESM (a CJS file in the browser bundle leaks a bare `require(...)`
// or `module.exports` and throws at load). The two cores are therefore kept as
// deliberate twins and guarded by a parity test in test/i18n.test.js — change
// shared behaviour in BOTH files.
const i18next = require('i18next');

// Locale data loaded from JSON (single source of truth)
const LOCALE_DATA = require('./locale-data.json');

// Export just the locale codes for backward compatibility
const SUPPORTED_LOCALES = LOCALE_DATA.map(locale => locale.code);

// Merge quirk preserved verbatim from the original implementation:
// Note: due some random thing in TypeScript, 'requiring' a JSON file with a space in a key name, only adds it to the default export
// If changing this behaviour, please also check the comments and signup-form apps in another language (mainly sentences with a space in them)
function mergeDefaultExport(res) {
    return {...res, ...(res.default && typeof res.default === 'object' ? res.default : {})};
}

// Factory: given a resource loader, produce a `generateResources(locales, ns)` fn
// with the exact original behaviour/shape. Callers that need the classic dynamic-require
// behaviour just use the default-exported `generateResources` below.
function createGenerateResources(loadResource) {
    return function generateResources(locales, ns) {
        return locales.reduce((acc, locale) => {
            let res = loadResource(locale, ns);
            // Fallback to English if a locale/namespace pair is missing entirely.
            if (res === undefined) {
                res = loadResource('en', ns);
            }
            // English floor: if even English is missing for this namespace, use an
            // empty object so the promised English fallback never lets
            // mergeDefaultExport receive undefined (which would throw).
            acc[locale] = {
                [ns]: mergeDefaultExport(res || {})
            };
            return acc;
        }, {});
    };
}

function createI18n({generateThemeResources, generateResources: genResources}) {
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
            resources = genResources(SUPPORTED_LOCALES, ns);
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
    createGenerateResources,
    mergeDefaultExport,
    LOCALE_DATA,
    SUPPORTED_LOCALES
};
