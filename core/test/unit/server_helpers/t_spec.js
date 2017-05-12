// Test: {{t}} translation helper

var should = require('should'),
    helpers = require('../../../server/helpers'),
    proxy = require('../../../server/helpers/proxy'),
    i18n = proxy.i18n,
    locale = i18n.locale();

describe('{{t}} helper', function () {
    if (locale.substring(0, 2) === 'en') {
        it('returns correct frontend text string', function () {
            var expected = 'Page',
                rendered = helpers.t.call({}, 'frontend', 'Page', {});
            should.exist(rendered);
            rendered.string.should.equal(expected);
        });
        it('returns correct default theme text string', function () {
            var expected = 'Proudly published with <a href="https://ghost.org">Ghost</a>',
                rendered = helpers.t.call({}, 'casper', 'Proudly published with \{ghostLink\}', {
                    hash: {
                        ghostLink: '<a href="https://ghost.org">Ghost</a>'
                    }
                });
            should.exist(rendered);
            rendered.string.should.equal(expected);
        });
    } else {
        it('returns frontend text string translation', function () {
            var rendered = helpers.t.call({}, 'frontend', 'Page', {});
            should.exist(rendered);
        });
        it('returns default theme text string translation', function () {
            var rendered = helpers.t.call({}, 'casper', 'Proudly published with \{ghostLink\}', {
                    hash: {
                        ghostLink: '<a href="https://ghost.org">Ghost</a>'
                    }
                });
            should.exist(rendered);
            rendered.string.should.match(/<a href\=\"https\:\/\/ghost\.org\">Ghost<\/a>/);
        });
    }
});
