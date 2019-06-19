const should = require('should'),
    settingsCache = require('../../../server/services/settings/cache'),
    helpers = require('../../../frontend/helpers'),
    proxy = require('../../../frontend/helpers/proxy');

describe('{{lang}} helper', function () {
    beforeEach(function () {
        settingsCache.set('default_locale', {value: 'en'});
    });

    afterEach(function () {
        settingsCache.shutdown();
    });

    it('returns correct language tag', function () {
        let expected = proxy.i18n.locale(),
            rendered = helpers.lang.call();

        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
