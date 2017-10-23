// Test: {{lang}} helper
// {{lang}} gives the current language tag
// Usage example: <html lang="{{lang}}">
//
// Examples of language tags from RFC 5646:
// de (German)
// fr (French)
// ja (Japanese)
// en-US (English as used in the United States)
//
// Standard:
// Language tags in HTML and XML
// https://www.w3.org/International/articles/language-tags/

var should = require('should'),
    helpers = require('../../../server/helpers'),
    proxy = require('../../../server/helpers/proxy');

describe('{{lang}} helper', function () {
    it('returns correct language tag', function () {
        var expected = proxy.i18n.locale(),
            rendered = helpers.lang.call();
        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
