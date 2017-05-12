// Test: {{t_css}} translation helper for css accepts no parameters,
// and returns URI for translation stylesheet such as for example:
// "/assets/css/en.css?v=4999b1c396"

var should = require('should'),
    helpers = require('../../../server/helpers');

describe('{{t_css}} helper', function () {
    it('returns correct URI for translation stylesheet', function () {
        var rendered = helpers.t_css.call();
        should.exist(rendered);
        rendered.string.should.match(/^\/assets\/css\/.+\?v\=[0-9a-f]{10}$/);
    });
});
