/**
 * Inline i18n for Portal
 *
 * Simplified i18n implementation that works in ES modules.
 * For English, returns the key as the translation (Ghost's convention).
 * Supports interpolation with {placeholder} syntax.
 */

let currentLocale = 'en';

// For English, the key IS the translation (Ghost convention)
// Other locales would need translation maps loaded
const translations = {
    en: {} // Empty - keys are used as values
};

/**
 * Translation function
 * @param {string} key - Translation key (also the English text)
 * @param {Object} replacements - Optional interpolation values
 * @returns {string} Translated string
 */
export function t(key, replacements) {
    // Get translation or fall back to key (for English, always falls back)
    const localeData = translations[currentLocale] || {};
    let result = localeData[key] || key;

    // Handle interpolation: {placeholder} syntax
    if (replacements && typeof replacements === 'object') {
        Object.entries(replacements).forEach(([k, v]) => {
            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
    }

    return result;
}

/**
 * Initialize i18n with locale
 * @param {string} locale - Locale code (e.g., 'en', 'de')
 */
export function init(locale) {
    currentLocale = locale || 'en';
}

// i18n object compatible with @tryghost/i18n API
const i18n = {
    t,
    init,
    language: () => currentLocale
};

export default i18n;
