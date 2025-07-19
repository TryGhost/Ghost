const should = require('should');
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

    beforeEach(async function () {
        // Reset the i18n instance before each test
        themeI18next._i18n = null;
    });

    it('theme translation is DE', async function () {
        await themeI18next.init({activeTheme: 'locale-theme', locale: 'de'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Oben Links.');
    });

    it('theme translation is EN', async function () {
        await themeI18next.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', async function () {
        await themeI18next.init({activeTheme: 'locale-theme', locale: 'fr'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', async function () {
        await themeI18next.init({activeTheme: 'locale-theme-1.4', locale: 'de'});

        let rendered = t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Top left Button');
    });

    it('returns an empty string if translation key is an empty string', function () {
        let rendered = t.call({}, '', {
            hash: {}
        });

        rendered.should.eql('');
    });

    it('returns an empty string if translation key is missing', function () {
        let rendered = t.call({}, undefined, {
            hash: {}
        });

        rendered.should.eql('');
    });

    it('returns a translated string even if no options are passed', async function () {
        await themeI18next.init({activeTheme: 'locale-theme', locale: 'en'});

        let rendered = t.call({}, 'Top left Button');

        rendered.should.eql('Left Button on Top');
    });
});