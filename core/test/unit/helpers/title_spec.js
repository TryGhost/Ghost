var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{title}} Helper', function () {
    it('can render title', function () {
        var title = 'Hello World',
            rendered = helpers.title.call({title: title});

        should.exist(rendered);
        rendered.string.should.equal(title);
    });

    it('escapes correctly', function () {
        var rendered = helpers.title.call({title: '<h1>I am a title</h1>'});

        rendered.string.should.equal('&lt;h1&gt;I am a title&lt;/h1&gt;');
    });

    it('returns a blank string where title is missing', function () {
        var rendered = helpers.title.call({title: null});

        rendered.string.should.equal('');
    });

    it('returns a blank string where data missing', function () {
        var rendered = helpers.title.call({});

        rendered.string.should.equal('');
    });
});
