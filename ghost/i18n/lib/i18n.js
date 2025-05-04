const i18next = require('i18next');
const fs = require('fs-extra');
const path = require('path');

const SUPPORTED_LOCALES = [
    'af', // Afrikaans
    'ar', // Arabic
    'bg', // Bulgarian
    'bn', // Bengali
    'bs', // Bosnian
    'ca', // Catalan
    'cs', // Czech
    'da', // Danish
    'de', // German
    'de-CH', // Swiss German
    'el', // Greek
    'en', // English
    'eo', // Esperanto
    'es', // Spanish
    'et', // Estonian
    'fa', // Persian/Farsi
    'fi', // Finnish
    'fr', // French
    'gd', // Gaelic (Scottish)
    'he', // Hebrew
    'hi', // Hindi
    'hr', // Croatian
    'hu', // Hungarian
    'id', // Indonesian
    'is', // Icelandic
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'kz', // Kazach
    'lt', // Lithuanian
    'lv', // Latvian
    'mk', // Macedonian
    'mn', // Mongolian
    'ms', // Malay
    'nb', // Norwegian Bokmål
    'ne', // Nepali
    'nl', // Dutch
    'nn', // Norwegian Nynorsk
    'pl', // Polish
    'pt', // Portuguese
    'pt-BR', // Portuguese (Brazil)
    'ro', // Romanian
    'ru', // Russian
    'si', // Sinhala
    'sk', // Slovak
    'sl', // Slovenian
    'sq', // Albanian
    'sr', // Serbian
    'sr-Cyrl', // Serbian (Cyrillic)
    'sv', // Swedish
    'th', // Thai
    'tr', // Turkish
    'uk', // Ukrainian
    'ur', // Urdu
    'uz', // Uzbek
    'vi', // Vietnamese
    'zh', // Chinese
    'zh-Hant', // Traditional Chinese
    'sw', // Swahili
    'ta' // Tamil
];

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

/**
 * @param {string} [lng]
 * @param {'ghost'|'portal'|'test'|'signup-form'|'comments'|'search'|'newsletter'|'theme'} ns
 * @param {object} [options]
 * @param {string} [options.themePath] - Path to theme's locales directory for theme namespace
 */
module.exports = (lng = 'en', ns = 'portal', options = {}) => {
    const i18nextInstance = i18next.createInstance();
    let interpolation = {
        prefix: '{{',
        suffix: '}}'
    };

    // Set single curly braces for theme and newsletter namespaces
    if (ns === 'theme' || ns === 'newsletter') {
        interpolation = {
            prefix: '{',
            suffix: '}'
        };
    }

    // Only disable HTML escaping for theme namespace
    if (ns === 'theme') {
        interpolation.escapeValue = false;
    }

    let resources;
    if (ns !== 'theme') {
        resources = generateResources(SUPPORTED_LOCALES, ns);
    } else {
        // For theme namespace, we need to load translations from the theme's locales directory
        resources = {};
        const themeLocalesPath = options.themePath;
        
        if (themeLocalesPath) {
            // Try to load the requested locale first
            try {
                const localePath = path.join(themeLocalesPath, `${lng}.json`);
                const content = fs.readFileSync(localePath, 'utf8');
                resources[lng] = {
                    theme: JSON.parse(content)
                };
            } catch (err) {
                // If the requested locale fails, try English as fallback
                try {
                    const enPath = path.join(themeLocalesPath, 'en.json');
                    const content = fs.readFileSync(enPath, 'utf8');
                    resources[lng] = {
                        theme: JSON.parse(content)
                    };
                } catch (enErr) {
                    // If both fail, use an empty object
                    resources[lng] = {
                        theme: {}
                    };
                }
            }
        } else {
            // If no theme path provided, use empty translations
            resources[lng] = {
                theme: {}
            };
        }
    }

    i18nextInstance.init({
        lng,

        // allow keys to be phrases having `:`, `.`
        nsSeparator: false,
        keySeparator: false,

        // if the value is an empty string, return the key
        // this allows empty strings for the en files, and causes all other languages to fallback to en.
        returnEmptyString: false,

        // load en as the fallback for any missing language.
        // load nb as the fallback for no for backwards compatibility
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

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
module.exports.generateResources = generateResources;
