const i18next = require('i18next');

const SUPPORTED_LOCALES = [
    'af', // Afrikaans
    'bg', // Bulgarian
    'ca', // Catalan
    'cs', // Czech
    'da', // Danish
    'de', // German
    'en', // English
    'eo', // Esperanto
    'es', // Spanish
    'fi', // Finnish
    'fr', // French
    'hr', // Croatian
    'hu', // Hungarian
    'id', // Indonesian
    'it', // Italian
    'ko', // Korean
    'mn', // Mongolian
    'ms', // Malay
    'nl', // Dutch
    'no', // Norwegian
    'nn', // Norwegian Nynorsk
    'pl', // Polish
    'pt', // Portuguese
    'pt-BR', // Portuguese (Brazil)
    'ro', // Romanian
    'ru', // Russian
    'si', // Sinhala
    'sl', // Slovenian
    'sq', // Albanian
    'sr', // Serbian
    'sv', // Swedish
    'tr', // Turkish
    'uk', // Ukrainian
    'uz', // Uzbek
    'vi', // Vietnamese
    'zh', // Chinese
    'zh-Hant' // Traditional Chinese
];

/**
 * @param {string} [lng]
 * @param {'ghost'|'portal'|'test'|'signup-form'} ns
 */
module.exports = (lng = 'en', ns = 'portal') => {
    const i18nextInstance = i18next.createInstance();
    i18nextInstance.init({
        lng,

        // allow keys to be phrases having `:`, `.`
        nsSeparator: false,
        keySeparator: false,

        // if the value is an empty string, return the key
        returnEmptyString: false,

        // do not load a fallback
        fallbackLng: false,

        ns: ns,
        defaultNS: ns,

        resources: SUPPORTED_LOCALES.reduce((acc, locale) => {
            acc[locale] = {
                [ns]: require(`../locales/${locale}/${ns}.json`)
            };
            return acc;
        }, {})
    });

    return i18nextInstance;
};

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
