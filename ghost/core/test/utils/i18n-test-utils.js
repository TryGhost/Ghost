const path = require('path');
const themeI18n = require('../../core/frontend/services/theme-engine/i18n');

const themesPath = path.join(__dirname, './fixtures/themes/');

/**
 * Sets up theme i18n test state.
 *
 * Call in a `before()` hook. Returns a teardown function to call in `after()`.
 *
 * @param {object} options
 * @param {string} [options.locale='en'] - initial locale to set up
 * @param {string} [options.activeTheme='locale-theme'] - theme fixture name
 * @returns {object} { teardown }
 */
function setupI18nTest({locale = 'en', activeTheme = 'locale-theme'} = {}) {
    const ogBasePath = themeI18n.basePath;

    themeI18n.basePath = themesPath;

    initLocale({locale, activeTheme});

    return {
        /**
         * Clean up all i18n state. Call in `after()`.
         */
        teardown() {
            themeI18n.basePath = ogBasePath;
            themeI18n._i18n = null;
            themeI18n._locale = 'en';
            themeI18n._activeTheme = null;
        }
    };
}

/**
 * Re-initialize theme i18n with a given locale.
 * Use in `beforeEach()` or inside individual tests to switch locale.
 *
 * @param {object} options
 * @param {string} [options.locale='en']
 * @param {string} [options.activeTheme='locale-theme']
 */
function initLocale({locale = 'en', activeTheme = 'locale-theme'} = {}) {
    themeI18n.init({activeTheme, locale});
}

module.exports = {
    setupI18nTest,
    initLocale
};
