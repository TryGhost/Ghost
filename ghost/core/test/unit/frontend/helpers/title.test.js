const should = require('should');

// Stuff we are testing
const title = require('../../../../core/frontend/helpers/title');

describe('{{title}} Helper', function () {
    it('can render title', function () {
        const rendered = title.call({title: 'Hello World'});

        should.exist(rendered);
        rendered.string.should.equal('Hello World');
    });

    it('escapes correctly', function () {
        const rendered = title.call({title: '<h1>I am a title</h1>'});

        rendered.string.should.equal('&lt;h1&gt;I am a title&lt;/h1&gt;');
    });

    it('returns a blank string where title is missing', function () {
        const rendered = title.call({title: null});

        rendered.string.should.equal('');
    });

    it('returns a blank string where data missing', function () {
        const rendered = title.call({});

        rendered.string.should.equal('');
    });
});
