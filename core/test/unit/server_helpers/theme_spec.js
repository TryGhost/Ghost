// Test: {{theme}} helper
// {{theme}} gives the simplified name of the active theme, as used in file names, etc.

var should = require('should'),
    helpers = require('../../../server/helpers'),
    proxy = require('../../../server/helpers/proxy');

describe('{{theme}} helper', function () {
    it('returns correct active theme', function () {
        var expected = proxy.settingsCache.get('active_theme') || 'casper',
            rendered = helpers.theme.call();
        should.exist(rendered);
        rendered.string.should.equal(expected);
    });
});
