const path = require('path');
const fs = require('fs');
const debug = require('@tryghost/debug')('i18n');
const {createI18n, generateResources, LOCALE_DATA, SUPPORTED_LOCALES} = require('./i18n-core');

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
        let needsFallback = false;
        // Try to load the locale file, fallback to English
        const localePath = path.join(themeLocalesPath, `${locale}.json`);
        if (fs.existsSync(localePath)) {
            try {
                // Delete from require cache to ensure fresh reads for theme files
                delete require.cache[require.resolve(localePath)];
                res = require(localePath);
            } catch (err) {
                debug(`Error loading theme locale file: ${locale}`);
                needsFallback = true;
            }
        } else {
            needsFallback = true;
        }

        if (needsFallback) {
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

const i18n = createI18n({
    generateThemeResources(lng, options) {
        debug(`generateThemeResources: ${lng}, ${options.themePath}`);
        return generateThemeResources(lng, options.themePath);
    }
});

module.exports = i18n;
module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
module.exports.LOCALE_DATA = LOCALE_DATA;
module.exports.generateResources = generateResources;
