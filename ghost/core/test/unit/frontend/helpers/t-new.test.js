const assert = require('node:assert/strict');
const path = require('path');
const sinon = require('sinon');
const t = require('../../../../core/frontend/helpers/t');
const themeI18next = require('../../../../core/frontend/services/theme-engine/i18next');
const labs = require('../../../../core/shared/labs');

describe('NEW{{t}} helper', function () {
    let ogBasePath = themeI18next.basePath;

    before(function () {
        sinon.stub(labs, 'isSet').withArgs('themeTranslation').returns(true);
        themeI18next.basePath = path.join(__dirname, '../../../utils/fixtures/themes/');
    });

    after(function () {
        sinon.restore();
        themeI18next.basePath = ogBasePath;
    });

    beforeEach(function () {
        // Reset the i18n instance before each test
        themeI18next._i18n = null;
    });

    it('theme translation is DE', function () {
        themeI18next.init({activeTheme: 'locale-theme', locale: 'de'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Oben Links.');
    });

    it('theme translation is EN', function () {
        themeI18next.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', function () {
        themeI18next.init({activeTheme: 'locale-theme', locale: 'fr'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        assert.equal(rendered, 'Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', function () {
        themeI18next.init({activeTheme: 'locale-theme-1.4', locale: 'de'});

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
        themeI18next.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button');

        assert.equal(rendered, 'Left Button on Top');
    });
});