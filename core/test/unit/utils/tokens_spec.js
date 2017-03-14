var should = require('should'), // jshint ignore:line
    uuid = require('uuid'),
    utils = require('../../../server/utils');

describe('Utils: tokens', function () {
    it('generate', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token;

        token = utils.tokens.resetToken.generateHash({
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

        token = utils.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = utils.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '12345678'
        });

        tokenIsCorrect.should.eql(true);
    });

    it('compare: error', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, tokenIsCorrect;

        token = utils.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = utils.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '123456'
        });

        tokenIsCorrect.should.eql(false);
    });

    it('extract', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, parts, email = 'test1@ghost.org';

        token = utils.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        parts = utils.tokens.resetToken.extract({
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

        token = utils.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '$2a$10$t5dY1uRRdjvqfNlXhae3uuc0nuhi.Rd7/K/9JaHHwSkLm6UUa3NsW',
            dbHash: dbHash
        });

        parts = utils.tokens.resetToken.extract({
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

        token = utils.tokens.resetToken.generateHash({
            email: email,
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        token = utils.encodeBase64URLsafe(token);
        token = encodeURIComponent(token);
        token = decodeURIComponent(token);
        token = utils.decodeBase64URLsafe(token);

        parts = utils.tokens.resetToken.extract({
            token: token
        });

        parts.email.should.eql(email);
        parts.expires.should.eql(expires);

        tokenIsCorrect = utils.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '12345678'
        });

        tokenIsCorrect.should.eql(true);
    });
});

