const should = require('should');
const sinon = require('sinon');
const ThemeI18n = require('../../../../../core/frontend/services/theme-engine/i18n/ThemeI18n');
const path = require('path');

describe('ThemeI18n Class behavior', function () {
    let i18n;
    const testBasePath = path.join(__dirname, '../../../../utils/fixtures/themes/');

    beforeEach(async function () {
        i18n = new ThemeI18n({basePath: testBasePath});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('defaults to en', function () {
        i18n._locale.should.eql('en');
    });

    it('can have a different locale set', async function () {
        await i18n.init({activeTheme: 'locale-theme', locale: 'fr'});
        i18n._locale.should.eql('fr');
    });
    
    it('initializes with theme path', async function () {
        await i18n.init({activeTheme: 'locale-theme', locale: 'de'});
        const result = i18n.t('Top left Button');
        result.should.eql('Oben Links.');
    });

    it('falls back to en when translation not found', async function () {
        await i18n.init({activeTheme: 'locale-theme', locale: 'fr'});
        const result = i18n.t('Top left Button');
        result.should.eql('Left Button on Top');
    });

    it('uses key as fallback when no translation files exist', async function () {
        await i18n.init({activeTheme: 'locale-theme-1.4', locale: 'de'});
        const result = i18n.t('Top left Button');
        result.should.eql('Top left Button');
    });

    it('returns empty string for empty key', async function () {
        await i18n.init({activeTheme: 'locale-theme', locale: 'en'});
        const result = i18n.t('');
        result.should.eql('');
    });

    it('throws error if used before initialization', function () {
        should(function () {
            i18n.t('some key');
        }).throw('Theme translation was used before it was initialised with key some key');
    });

    it('uses key fallback correctly', async function () {
        await i18n.init({activeTheme: 'locale-theme', locale: 'en'});
        const result = i18n.t('unknown string');
        result.should.eql('unknown string');
    });
});

