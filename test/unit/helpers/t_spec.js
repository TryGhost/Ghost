const should = require('should');
const path = require('path');
const helpers = require('../../../core/frontend/helpers');
const themeI18n = require('../../../core/frontend/services/theme-engine/i18n');

describe('{{t}} helper', function () {
    let ogBasePath = themeI18n.basePath;

    before(function () {
        themeI18n.basePath = path.join(__dirname, '../../utils/fixtures/themes/');
    });

    after(function () {
        themeI18n.basePath = ogBasePath;
    });

    it('theme translation is DE', function () {
        themeI18n.init({activeTheme: 'casper', locale: 'de'});

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Oben Links.');
    });

    it('theme translation is EN', function () {
        themeI18n.init({activeTheme: 'casper', locale: 'en'});

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme translation file found for FR', function () {
        themeI18n.init({activeTheme: 'casper', locale: 'fr'});

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Left Button on Top');
    });

    it('[fallback] no theme files at all, use key as translation', function () {
        themeI18n.init({activeTheme: 'casper-1.4', locale: 'de'});

        let rendered = helpers.t.call({}, 'Top left Button', {
            hash: {}
        });

        rendered.should.eql('Top left Button');
    });
});
