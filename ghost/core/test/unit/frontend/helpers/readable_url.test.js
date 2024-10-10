const should = require('should');
const readable_url = require('../../../../core/frontend/helpers/readable_url');

describe('{{#readable_url}} helper', function () {
    it('renders a short URL, without protocol, www, query params nor hash fragments', function () {
        const readable = readable_url.call(
            {},
            'https://www.foobar.com/some/path/?query=param#hash/'
        );

        readable.string.should.equal('foobar.com/some/path');
    });

    it('renders an empty string when the input is not a string', function () {
        const readable = readable_url.call(
            {},
            {foo: 'bar'}
        );

        readable.string.should.equal('');
    });

    it('returns the input string if not parsable as URL', function () {
        const readable = readable_url.call(
            {},
            'hello world'
        );

        readable.string.should.equal('hello world');
    });
});
