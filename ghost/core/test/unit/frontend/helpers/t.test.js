const assert = require('node:assert/strict');
const path = require('path');
const t = require('../../../../core/frontend/helpers/t');
const themeI18n = require('../../../../core/frontend/services/theme-engine/i18n');

describe('{{t}} helper', function () {
    let ogBasePath = themeI18n.basePath;

    before(function () {
        themeI18n.basePath = path.join(__dirname, '../../../utils/fixtures/themes/');
    });

    after(function () {
        themeI18n.basePath = ogBasePath;
    });

    it('theme translation is DE', function () {
        themeI18n.init({activeTheme: 'locale-theme', locale: 'de'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Oben Links.');
    });

    it('theme translation is EN', function () {
        themeI18n.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', function () {
        themeI18n.init({activeTheme: 'locale-theme', locale: 'fr'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', function () {
        themeI18n.init({activeTheme: 'locale-theme-1.4', locale: 'de'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Top left Button');
    });

    it('returns an empty string if translation key is an empty string', function () {
        let rendered = t.call({}, '', {
            hash: {}
        });

        assert.equal(rendered, '');
    });

    it('returns an empty string if translation key is missing', function () {
        let rendered = t.call({}, undefined, {
            hash: {}
        });

        assert.equal(rendered, '');
    });

    it('returns a translated string even if no options are passed', function () {
        themeI18n.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button');

        assert.equal(rendered, 'Left Button on Top');
    });
});
