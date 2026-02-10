const assert = require('node:assert/strict');
const sinon = require('sinon');
const ThemeI18n = require('../../../../../core/frontend/services/theme-engine/i18next/theme-i18n');
const path = require('path');

describe('NEW i18nextThemeI18n Class behavior', function () {
    let i18n;
    const testBasePath = path.join(__dirname, '../../../../utils/fixtures/themes/');

    beforeEach(function () {
        i18n = new ThemeI18n({basePath: testBasePath});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('defaults to en', function () {
        assert.equal(i18n._locale, 'en');
    });

    it('can have a different locale set', function () {
        i18n.init({activeTheme: 'locale-theme', locale: 'fr'});
        assert.equal(i18n._locale, 'fr');
    });

    it('initializes with theme path', function () {
        i18n.init({activeTheme: 'locale-theme', locale: 'de'});
        const result = i18n.t('Top left Button');
        assert.equal(result, 'Oben Links.');
    });

    it('falls back to en when translation not found', function () {
        i18n.init({activeTheme: 'locale-theme', locale: 'fr'});
        const result = i18n.t('Top left Button');
        assert.equal(result, 'Left Button on Top');
    });

    it('uses key as fallback when no translation files exist', function () {
        i18n.init({activeTheme: 'locale-theme-1.4', locale: 'de'});
        const result = i18n.t('Top left Button');
        assert.equal(result, 'Top left Button');
    });

    it('returns empty string for empty key', function () {
        i18n.init({activeTheme: 'locale-theme', locale: 'en'});
        const result = i18n.t('');
        assert.equal(result, '');
    });

    it('throws error if used before initialization', function () {
        assert.throws(
            () => i18n.t('some key'),
            {message: 'Theme translation was used before it was initialised with key some key'}
        );
    });

    it('uses key fallback correctly', function () {
        i18n.init({activeTheme: 'locale-theme', locale: 'en'});
        const result = i18n.t('unknown string');
        assert.equal(result, 'unknown string');
    });
});
