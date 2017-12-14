var should = require('should'), // jshint ignore:line
    uuid = require('uuid'),
    security = require('../../../../server/lib/security');

describe('Utils: tokens', function () {
    it('generate', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token;

        token = security.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: 'password',
            dbHash: dbHash
        });

        should.exist(token);
        token.length.should.be.above(0);
    });

    it('compare: success', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, tokenIsCorrect;

        token = security.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = security.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '12345678'
        });

        tokenIsCorrect.should.eql(true);
    });

    it('compare: error', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, tokenIsCorrect;

        token = security.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = security.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '123456'
        });

        tokenIsCorrect.should.eql(false);
    });

    it('extract', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, parts, email = 'test1@ghost.org';

        token = security.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        parts = security.tokens.resetToken.extract({
            token: token
        });

        parts.email.should.eql(email);
        parts.expires.should.eql(expires);
        should.not.exist(parts.password);
        should.not.exist(parts.dbHash);
    });

    it('extract', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, parts, email = 'test3@ghost.org';

        token = security.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '$2a$10$t5dY1uRRdjvqfNlXhae3uuc0nuhi.Rd7/K/9JaHHwSkLm6UUa3NsW',
            dbHash: dbHash
        });

        parts = security.tokens.resetToken.extract({
            token: token
        });

        parts.email.should.eql(email);
        parts.expires.should.eql(expires);
        should.not.exist(parts.password);
        should.not.exist(parts.dbHash);
    });

    it('can validate an URI encoded reset token', function () {
        var expires = Date.now() + 60 * 1000,
            email = 'test1@ghost.org',
            dbHash = uuid.v4(), token, tokenIsCorrect, parts;

        token = security.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        token = security.url.encodeBase64(token);
        token = encodeURIComponent(token);
        token = decodeURIComponent(token);
        token = security.url.decodeBase64(token);

        parts = security.tokens.resetToken.extract({
            token: token
        });

        parts.email.should.eql(email);
        parts.expires.should.eql(expires);

        tokenIsCorrect = security.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '12345678'
        });

        tokenIsCorrect.should.eql(true);
    });
});

