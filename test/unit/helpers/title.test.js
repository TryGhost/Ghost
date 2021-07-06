const should = require('should');

// Stuff we are testing
const helpers = require('../../../core/frontend/helpers');

describe('{{title}} Helper', function () {
    it('can render title', function () {
        const title = 'Hello World';
        const rendered = helpers.title.call({title: title});

        should.exist(rendered);
        rendered.string.should.equal(title);
    });

    it('escapes correctly', function () {
        const rendered = helpers.title.call({title: '<h1>I am a title</h1>'});

        rendered.string.should.equal('&lt;h1&gt;I am a title&lt;/h1&gt;');
    });

    it('returns a blank string where title is missing', function () {
        const rendered = helpers.title.call({title: null});

        rendered.string.should.equal('');
    });

    it('returns a blank string where data missing', function () {
        const rendered = helpers.title.call({});

        rendered.string.should.equal('');
    });
});
