const readable_url = require('../../../../core/frontend/helpers/readable_url');
const logging = require('@tryghost/logging');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

describe('{{#readable_url}} helper', function () {
    let loggingErrorStub; 

    beforeEach(function () {
        // Stub the logging.error method
        loggingErrorStub = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        // Restore the original logging.error method
        loggingErrorStub.restore();
    });

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

        sinon.assert.calledOnce(loggingErrorStub);
        sinon.assert.calledWith(loggingErrorStub, sinon.match.instanceOf(errors.IncorrectUsageError));

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
