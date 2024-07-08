const should = require('should');

const {validate} = require('../../../../../core/server/services/custom-redirects/validation');

describe('UNIT: custom redirects validation', function () {
    it('passes validation for a valid redirects config', function () {
        const config = [{
            permanent: true,
            from: '/test-params',
            to: '/result?q=abc'
        }];

        validate(config);
    });

    it('throws for an invalid redirects config format missing from parameter', function () {
        const config = [{
            permanent: true,
            to: '/'
        }];

        try {
            validate(config);
            should.fail('should have thrown');
        } catch (err) {
            err.message.should.equal('Incorrect redirects file format.');
        }
    });

    it('throws for an invalid redirects config having invalid RegExp in from field', function () {
        const config = [{
            permanent: true,
            from: '/invalid_regex/(/size/[a-zA-Z0-9_-.]*/[a-zA-Z0-9_-.]*/[0-9]*/[0-9]*/)([a-zA-Z0-9_-.]*)',
            to: '/'
        }];

        try {
            validate(config);
            should.fail('should have thrown');
        } catch (err) {
            err.message.should.equal('Incorrect RegEx in redirects file.');
            err.errorDetails.redirect.should.equal(config[0]);
            err.errorDetails.invalid.should.be.true();
        }
    });

    it('throws for an invalid redirects config having unsafe RegExp in from field', function () {
        const config = [{
            permanent: true,
            from: '^\/episodes\/([a-z0-9-]+)+\/$', // Unsafe due to the surplus + at the end causing infinite backtracking
            to: '/'
        }];

        try {
            validate(config);
            should.fail('should have thrown');
        } catch (err) {
            err.message.should.equal('Incorrect RegEx in redirects file.');
            err.errorDetails.redirect.should.equal(config[0]);
            err.errorDetails.unsafe.should.be.true();
            err.errorDetails.reason.should.equal('hitMaxBacktracks');
        }
    });

    it('throws when setting a file with wrong format: no array', function () {
        const config = {
            from: 'c',
            to: 'd'
        };

        try {
            validate(config);
            should.fail('should have thrown');
        } catch (err) {
            err.message.should.equal('Incorrect redirects file format.');
        }
    });
});
