const i18next = require('i18next');
const path = require('path');
const fs = require('fs-extra');

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
    'pa', // Punjabi (Gurmukhi, India)
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
 * @param {'ghost'|'portal'|'test'|'signup-form'|'comments'|'search'|'theme'} ns
 */
module.exports = (lng = 'en', ns = 'portal', options = {}) => {
    const i18nextInstance = i18next.createInstance();
    const interpolation = {
        prefix: '{',
        suffix: '}'
    };
    if (ns === 'theme') {
        interpolation.escapeValue = false;
    }
    let resources;
    if (ns !== 'theme') {
        resources = generateResources(SUPPORTED_LOCALES, ns);
    } else {
        resources = {};

        const themeLocalesPath = options.themePath;
        if (themeLocalesPath) {
            // Try to load the requested locale first

            const localePath = path.join(themeLocalesPath, `${lng}.json`);
            const localePathExists = fs.existsSync(localePath);
            if (localePathExists) {
                const content = fs.readFileSync(localePath, 'utf8');
                resources[lng] = {
                    theme: JSON.parse(content)
                };
                return;
            }
            // If the requested locale fails, try English as fallback
            const enPath = path.join(themeLocalesPath, 'en.json');
            const enPathExists = fs.existsSync(enPath);
            if (enPathExists) {
                const content = fs.readFileSync(enPath, 'utf8');
                resources[lng] = {
                    theme: JSON.parse(content)
                };
                return;
            }

            // If both fail, use an empty object
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

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
module.exports.generateResources = generateResources;
