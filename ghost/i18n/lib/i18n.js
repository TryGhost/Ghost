const i18next = require('i18next');
const path = require('path');
const fs = require('fs');
const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('i18n');

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

function generateThemeResources(lng, themeLocalesPath) {
    if (!themeLocalesPath) {
        return {
            [lng]: {
                theme: {}
            }
        };
    }

    // Get available theme locales by scanning the directory
    let availableLocales = [];
    try {
        const files = fs.readdirSync(themeLocalesPath);
        availableLocales = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
    } catch (err) {
        // If we can't read the directory, fall back to just trying the requested locale and English
        
        availableLocales = [lng, 'en'];
    }

    // Always include the requested locale and English as fallbacks
    const locales = [...new Set([lng, ...availableLocales, 'en'])];

    return locales.reduce((acc, locale) => {
        let res;
        // Try to load the locale file, fallback to English
        try {
            const localePath = path.join(themeLocalesPath, `${locale}.json`);
            if (fs.existsSync(localePath)) {
                // Delete from require cache to ensure fresh reads for theme files
                delete require.cache[require.resolve(localePath)];
                res = require(localePath);
            } else {
                throw new errors.IncorrectUsageError({
                    message: `Locale file not found: ${locale}`,
                    context: locale
                });
            }
        } catch (err) {
            debug(`Error loading theme locale file: ${locale}`);
            // Fallback to English if it's not the locale we're already trying
            if (locale !== 'en') {
                try {
                    const enPath = path.join(themeLocalesPath, 'en.json');
                    if (fs.existsSync(enPath)) {
                        // Delete from require cache to ensure fresh reads for theme files
                        delete require.cache[require.resolve(enPath)];
                        res = require(enPath);
                    } else {
                        res = {};
                    }
                } catch (enErr) {
                    res = {};
                }
            } else {
                debug(`Theme en.json file not found`);
                res = {};
            }
        }

        // Handle the same default export issue as other namespaces
        acc[locale] = {
            theme: {...res, ...(res.default && typeof res.default === 'object' ? res.default : {})}
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
        debug(`generateThemeResources: ${lng}, ${options.themePath}`);
        resources = generateThemeResources(lng, options.themePath);
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
module.exports.LOCALE_DATA = LOCALE_DATA;
module.exports.generateResources = generateResources;
