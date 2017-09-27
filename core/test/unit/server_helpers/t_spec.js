// Test: {{t}} translation helper
// Compatibility with both old themes and i18n-capable themes

var should = require('should'),
    helpers = require('../../../server/helpers'),
    proxy = require('../../../server/helpers/proxy'),
    i18n = proxy.i18n,
    locale = i18n.locale();

describe('{{t}} helper', function () {
    if (locale.substring(0, 2) === 'en') {
        it('returns correct frontend text string', function () {
            var expected = 'Page',
                rendered = helpers.t.call({}, 'Page', {
                    hash: {
                    }
                });
            should.exist(rendered);
            rendered.should.equal(expected);
        });
    } else {
        it('returns frontend text string translation', function () {
            var rendered = helpers.t.call({}, 'Page', {
                    hash: {
                    }
                });
            should.exist(rendered);
        });
    }
});
