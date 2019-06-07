const should = require('should'),
    path = require('path'),
    settingsCache = require('../../../server/services/settings/cache'),
    helpers = require('../../../frontend/helpers'),
    common = require('../../../server/lib/common'),
    configUtils = require('../../utils/configUtils');

describe('{{t}} helper', function () {
    beforeEach(function () {
        settingsCache.set('active_theme', {value: 'casper'});
        configUtils.set('paths:contentPath', path.join(__dirname, '../../utils/fixtures/'));
    });

    afterEach(function () {
        configUtils.restore();
        settingsCache.shutdown();
    });

    it('theme translation is DE', function () {
        settingsCache.set('default_locale', {value: 'de'});

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Oben Links.');
    });

    it('theme translation is EN', function () {
        settingsCache.set('default_locale', {value: 'en'});
        common.i18n.loadThemeTranslations();

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', function () {
        settingsCache.set('default_locale', {value: 'fr'});
        common.i18n.loadThemeTranslations();

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', function () {
        settingsCache.set('active_theme', {value: 'casper-1.4'});
        settingsCache.set('default_locale', {value: 'de'});
        common.i18n.loadThemeTranslations();

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Top left Button');
    });
});
