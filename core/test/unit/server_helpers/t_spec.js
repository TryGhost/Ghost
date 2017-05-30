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
                rendered = helpers.t.call({}, 'Page', {
                    hash: {
                        where: 'frontend'
                    }
                });
            should.exist(rendered);
            rendered.should.equal(expected);
        });
        // Removed for compatibility with both old themes and i18n-capable themes:
        //
        // it('returns correct default theme text string', function () {
        //     var expected = 'Proudly published with <a href="https://ghost.org">Ghost</a>',
        //         rendered = helpers.t.call({}, 'Proudly published with \{ghostlink\}', {
        //             hash: {
        //                 ghostlink: '<a href="https://ghost.org">Ghost</a>'
        //             }
        //         });
        //     should.exist(rendered);
        //     rendered.should.equal(expected);
        // });
    } else {
        it('returns frontend text string translation', function () {
            var rendered = helpers.t.call({}, 'Page', {
                    hash: {
                        where: 'frontend'
                    }
                });
            should.exist(rendered);
        });
        // Removed for compatibility with both old themes and i18n-capable themes:
        //
        // it('returns default theme text string translation', function () {
        //     var rendered = helpers.t.call({}, 'Proudly published with \{ghostlink\}', {
        //             hash: {
        //                 ghostlink: '<a href="https://ghost.org">Ghost</a>'
        //             }
        //         });
        //     should.exist(rendered);
        //     rendered.should.match(/<a href\=\"https\:\/\/ghost\.org\">Ghost<\/a>/);
        // });
    }
});
