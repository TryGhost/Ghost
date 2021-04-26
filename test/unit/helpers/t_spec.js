const should = require('should');
const path = require('path');
const settingsCache = require('../../../core/server/services/settings/cache');
const helpers = require('../../../core/frontend/helpers');
const themeI18n = require('../../../core/frontend/services/theme-engine/i18n');
const configUtils = require('../../utils/configUtils');

describe('{{t}} helper', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../utils/fixtures/'));
    });

    afterEach(function () {
        configUtils.restore();
        settingsCache.shutdown();
    });

    it('theme translation is DE', function () {
        settingsCache.set('lang', {value: 'de'});
        themeI18n.init('casper');

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Oben Links.');
    });

    it('theme translation is EN', function () {
        settingsCache.set('lang', {value: 'en'});
        themeI18n.init('casper');

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', function () {
        settingsCache.set('lang', {value: 'fr'});
        themeI18n.init('casper');

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', function () {
        settingsCache.set('lang', {value: 'de'});
        themeI18n.init('casper-1.4');

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Top left Button');
    });
});
