const should = require('should');
const settingsCache = require('../../../server/services/settings/cache');
const helpers = require('../../../frontend/helpers');
const proxy = require('../../../frontend/helpers/proxy');

describe('{{lang}} helper', function () {
    beforeEach(function () {
        settingsCache.set('default_locale', {value: 'en'});
    });

    afterEach(function () {
        settingsCache.shutdown();
    });

    it('returns correct language tag', function () {
        let expected = proxy.themeI18n.locale(),
            rendered = helpers.lang.call();

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
