const should = require('should');
const settingsCache = require('../../../core/server/services/settings/cache');
const helpers = require('../../../core/frontend/helpers');
const proxy = require('../../../core/frontend/services/proxy');

describe('{{lang}} helper', function () {
    beforeEach(function () {
        settingsCache.set('lang', {value: 'en'});
    });

    afterEach(function () {
        settingsCache.shutdown();
    });

    it('returns correct language tag', function () {
        let expected = proxy.themeI18n.locale();
        let rendered = helpers.lang.call();

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
