require('./utils');
const should = require('should');
const crypto = require('crypto');
const security = require('../');

describe('Utils: tokens', function () {
    it('generate', function () {
        const expires = Date.now() + 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;

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
        const expires = Date.now() + 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;
        let tokenIsCorrect;

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

        tokenIsCorrect.correct.should.eql(true);
        should(tokenIsCorrect.reason).be.undefined;
    });

    it('compare: error from invalid password', function () {
        const expires = Date.now() + 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;
        let tokenIsCorrect;

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

        tokenIsCorrect.correct.should.eql(false);
        tokenIsCorrect.reason.should.eql('invalid');
    });

    it('compare: error from invalid expires parameter', function () {
        const invalidDate = 'not a date';
        const dbHash = crypto.randomUUID();
        let token;
        let tokenIsCorrect;

        token = security.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: invalidDate,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = security.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '123456'
        });

        tokenIsCorrect.correct.should.eql(false);
        tokenIsCorrect.reason.should.eql('invalid_expiry');
    });

    it('compare: error from expired token', function () {
        const dateInThePast = Date.now() - 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;
        let tokenIsCorrect;

        token = security.tokens.resetToken.generateHash({
            email: 'test1@ghost.org',
            expires: dateInThePast,
            password: '12345678',
            dbHash: dbHash
        });

        tokenIsCorrect = security.tokens.resetToken.compare({
            token: token,
            dbHash: dbHash,
            password: '123456'
        });

        tokenIsCorrect.correct.should.eql(false);
        tokenIsCorrect.reason.should.eql('expired');
    });

    it('extract', function () {
        const expires = Date.now() + 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;
        let parts;
        const email = 'test1@ghost.org';

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

    it('extract - hashed password', function () {
        const expires = Date.now() + 60 * 1000;
        const dbHash = crypto.randomUUID();
        let token;
        let parts;
        const email = 'test3@ghost.org';

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
        const expires = Date.now() + 60 * 1000;
        const email = 'test1@ghost.org';
        const dbHash = crypto.randomUUID();
        let token;
        let tokenIsCorrect;
        let parts;

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

        tokenIsCorrect.correct.should.eql(true);
    });
});

