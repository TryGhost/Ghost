const i18next = require('i18next');

// Locale data with both codes and human-readable labels
const LOCALE_DATA = [
    {code: 'af', label: 'Afrikaans'},
    {code: 'ar', label: 'Arabic'},
    {code: 'bg', label: 'Bulgarian'},
    {code: 'bn', label: 'Bengali'},
    {code: 'bs', label: 'Bosnian'},
    {code: 'ca', label: 'Catalan'},
    {code: 'cs', label: 'Czech'},
    {code: 'da', label: 'Danish'},
    {code: 'de', label: 'German'},
    {code: 'de-CH', label: 'Swiss German'},
    {code: 'el', label: 'Greek'},
    {code: 'en', label: 'English'},
    {code: 'eo', label: 'Esperanto'},
    {code: 'es', label: 'Spanish'},
    {code: 'et', label: 'Estonian'},
    {code: 'eu', label: 'Basque'},
    {code: 'fa', label: 'Persian/Farsi'},
    {code: 'fi', label: 'Finnish'},
    {code: 'fr', label: 'French'},
    {code: 'gd', label: 'Gaelic (Scottish)'},
    {code: 'he', label: 'Hebrew'},
    {code: 'hi', label: 'Hindi'},
    {code: 'hr', label: 'Croatian'},
    {code: 'hu', label: 'Hungarian'},
    {code: 'id', label: 'Indonesian'},
    {code: 'is', label: 'Icelandic'},
    {code: 'it', label: 'Italian'},
    {code: 'ja', label: 'Japanese'},
    {code: 'ko', label: 'Korean'},
    {code: 'kz', label: 'Kazakh'},
    {code: 'lt', label: 'Lithuanian'},
    {code: 'lv', label: 'Latvian'},
    {code: 'mk', label: 'Macedonian'},
    {code: 'mn', label: 'Mongolian'},
    {code: 'ms', label: 'Malay'},
    {code: 'nb', label: 'Norwegian Bokmål'},
    {code: 'ne', label: 'Nepali'},
    {code: 'nl', label: 'Dutch'},
    {code: 'nn', label: 'Norwegian Nynorsk'},
    {code: 'pa', label: 'Punjabi'},
    {code: 'pl', label: 'Polish'},
    {code: 'pt', label: 'Portuguese'},
    {code: 'pt-BR', label: 'Portuguese (Brazil)'},
    {code: 'ro', label: 'Romanian'},
    {code: 'ru', label: 'Russian'},
    {code: 'si', label: 'Sinhala'},
    {code: 'sk', label: 'Slovak'},
    {code: 'sl', label: 'Slovenian'},
    {code: 'sq', label: 'Albanian'},
    {code: 'sr', label: 'Serbian'},
    {code: 'sr-Cyrl', label: 'Serbian (Cyrillic)'},
    {code: 'sv', label: 'Swedish'},
    {code: 'sw', label: 'Swahili'},
    {code: 'ta', label: 'Tamil'},
    {code: 'th', label: 'Thai'},
    {code: 'tr', label: 'Turkish'},
    {code: 'uk', label: 'Ukrainian'},
    {code: 'ur', label: 'Urdu'},
    {code: 'uz', label: 'Uzbek'},
    {code: 'vi', label: 'Vietnamese'},
    {code: 'zh', label: 'Chinese'},
    {code: 'zh-Hant', label: 'Traditional Chinese'}
];

// Export just the locale codes
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

/**
 * @param {string} [lng]
 * @param {'ghost'|'portal'|'test'|'signup-form'|'comments'|'search'} ns
 */
module.exports = (lng = 'en', ns = 'portal') => {
    const i18nextInstance = i18next.createInstance();
    const interpolation = {
        prefix: '{',
        suffix: '}'
    };

    let resources = generateResources(SUPPORTED_LOCALES, ns);
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
module.exports.LOCALE_DATA = LOCALE_DATA;
module.exports.generateResources = generateResources;
