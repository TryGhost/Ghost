const sinon = require('sinon');
const path = require('path');
const themeI18n = require('../../core/frontend/services/theme-engine/i18n');
const themeI18next = require('../../core/frontend/services/theme-engine/i18next');
const labs = require('../../core/shared/labs');

const themesPath = path.join(__dirname, './fixtures/themes/');

/**
 * Sets up i18n test state for a given implementation (legacy or new).
 *
 * Call in a `before()` hook. Returns a teardown function to call in `after()`.
 *
 * @param {object} options
 * @param {boolean} options.useNewTranslation - true for themeI18next, false for themeI18n
 * @param {string} [options.locale='en'] - initial locale to set up
 * @param {string} [options.activeTheme='locale-theme'] - theme fixture name
 * @returns {object} { teardown, initLocale }
 */
function setupI18nTest({useNewTranslation, locale = 'en', activeTheme = 'locale-theme'} = {}) {
    const ogI18nBasePath = themeI18n.basePath;
    const ogI18nextBasePath = themeI18next.basePath;

    sinon.stub(labs, 'isSet').withArgs('themeTranslation').returns(useNewTranslation);

    themeI18n.basePath = themesPath;
    themeI18next.basePath = themesPath;

    initLocale({useNewTranslation, locale, activeTheme});

    return {
        /**
         * Clean up all i18n state. Call in `after()`.
         */
        teardown() {
            themeI18n.basePath = ogI18nBasePath;
            themeI18next.basePath = ogI18nextBasePath;
            themeI18n._strings = null;
            themeI18n._locale = themeI18n.defaultLocale?.() ?? 'en';
            themeI18n._activetheme = undefined;
            themeI18next._i18n = null;
            themeI18next._locale = 'en';
            themeI18next._activeTheme = null;
        }
    };
}

/**
 * Re-initialize the active i18n implementation with a given locale.
 * Use in `beforeEach()` or inside individual tests to switch locale.
 *
 * @param {object} options
 * @param {boolean} options.useNewTranslation
 * @param {string} [options.locale='en']
 * @param {string} [options.activeTheme='locale-theme']
 */
function initLocale({useNewTranslation, locale = 'en', activeTheme = 'locale-theme'} = {}) {
    if (useNewTranslation) {
        themeI18next.init({activeTheme, locale});
    } else {
        themeI18n.init({activeTheme, locale});
    }
}

module.exports = {
    setupI18nTest,
    initLocale
};
