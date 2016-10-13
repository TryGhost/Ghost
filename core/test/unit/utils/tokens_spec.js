var uuid = require('node-uuid'),
    should = require('should'),
    utils = require('../../../server/utils');

should.equal(true, true);

describe('Utils: tokens', function () {
    it('generate', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token;

        token = utils.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
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

    it('can validate an URI encoded reset token', function () {
        var expires = Date.now() + 60 * 1000,
            dbHash = uuid.v4(), token, tokenIsCorrect;

        token = utils.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: expires,
            password: '12345678',
            dbHash: dbHash
        });

        token = utils.encodeBase64URLsafe(token);
        token = encodeURIComponent(token);
        token = decodeURIComponent(token);
        token = utils.decodeBase64URLsafe(token);

        tokenIsCorrect = utils.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '12345678'
        });

        tokenIsCorrect.should.eql(true);
    });
});

