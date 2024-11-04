// loop through all the items in ../locales/locale/{portal,search,comments,ghost}.json and replace {{ with { and }} with }
let fs = require('fs');
let path = require('path');

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
    'mk', // Macedonian
    'mn', // Mongolian
    'ms', // Malay
    'nl', // Dutch
    'nn', // Norwegian Nynorsk
    'no', // Norwegian
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

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

SUPPORTED_LOCALES.forEach(locale => {
    const portal = require(path.join(LOCALES_DIR, locale, 'portal.json'));
    const search = require(path.join(LOCALES_DIR, locale, 'search.json'));
    const comments = require(path.join(LOCALES_DIR, locale, 'comments.json'));
    const ghost = require(path.join(LOCALES_DIR, locale, 'ghost.json'));
    const signupForm = require(path.join(LOCALES_DIR, locale, 'signup-form.json'));

    const files = [portal, search, comments, ghost, signupForm];
    console.log('Processing locale:', locale);
    files.forEach(file => {
        for (const key in file) {
            // Replace all occurrences of {{ with { and }} with } in both the key and the value
            if (file.hasOwnProperty(key)) {
                // fix the value
                file[key] = file[key].replace(/{{/g, '{').replace(/}}/g, '}');
                // change the key itself
                if (key.includes('{{') && key.includes('}}')) {
                    let newKey = key.replace(/{{/g, '{').replace(/}}/g, '}');
                    file[newKey] = file[key];
                    delete file[key];
                }
            }
        }
        // write out the updated file
        let filename = path.join(LOCALES_DIR, locale, 
            file === portal ? 'portal.json' : file === search ? 'search.json' : 
            file === comments ? 'comments.json' : file === ghost? 'ghost.json' : file === signupForm ? 'signup-form.json' : 'broken');
        fs.writeFileSync(filename, JSON.stringify(file, null, 4));

    });
});

