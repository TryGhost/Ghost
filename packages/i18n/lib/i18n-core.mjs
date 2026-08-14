/**
 * ESM (browser) core for @tryghost/i18n — the pure-ESM twin of ./i18n-core.js.
 *
 * The per-namespace registry entries load through ./esm-factory.mjs, so this
 * path must stay 100% ESM: a CJS file anywhere in the browser graph leaks a
 * bare `require(...)` or `module.exports` into the UMD bundle and throws
 * ("require is not defined" / "module is not defined") at load. That is why the
 * core is duplicated here rather than shared from the CJS file.
 *
 * Keep behaviour identical to ./i18n-core.js — the two are guarded by a parity
 * test in test/i18n.test.js. Change shared behaviour in BOTH files.
 */
import i18next from 'i18next';
import LOCALE_DATA from './locale-data.json' with {type: 'json'};

// Export just the locale codes for backward compatibility
const SUPPORTED_LOCALES = LOCALE_DATA.map(locale => locale.code);

// Merge quirk preserved verbatim from the original implementation:
// Note: due some random thing in TypeScript, 'requiring' a JSON file with a space in a key name, only adds it to the default export
// If changing this behaviour, please also check the comments and signup-form apps in another language (mainly sentences with a space in them)
function mergeDefaultExport(res) {
    return {...res, ...(res.default && typeof res.default === 'object' ? res.default : {})};
}

// Factory: given a resource loader, produce a `generateResources(locales, ns)` fn
// with the exact original behaviour/shape.
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

export {createI18n, createGenerateResources, mergeDefaultExport, LOCALE_DATA, SUPPORTED_LOCALES};
