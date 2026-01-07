const sinon = require('sinon');
const should = require('should');

const RequestIntegrityTokenProvider = require('../../../../../core/server/services/members/RequestIntegrityTokenProvider');

const tokenProvider = new RequestIntegrityTokenProvider({
    themeSecret: 'test',
    tokenDuration: 100
});

describe('RequestIntegrityTokenProvider', function () {
    beforeEach(function () {
        sinon.useFakeTimers(new Date('2021-01-01'));
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('create', function () {
        it('should create a HMAC digest from the secret', function () {
            const token = tokenProvider.create();

            token.should.be.a.String();
            token.split(':').should.be.an.Array().with.lengthOf(3);
            const [timestamp, nonce, digest] = token.split(':');

            timestamp.should.equal((new Date('2021-01-01').valueOf() + 100).toString());

            nonce.should.match(/[0-9a-f]{16}/);

            digest.should.be.a.String().with.lengthOf(64);
        });
    });

    describe('validate', function () {
        it('should verify a HMAC digest from the secret', function () {
            const token = tokenProvider.create();
            const result = tokenProvider.validate(token);

            result.should.be.true();
        });

        it('should fail to verify an expired token', function () {
            const token = tokenProvider.create();
            sinon.clock.tick(101);
            const result = tokenProvider.validate(token);

            result.should.be.false();
        });

        it('should fail to verify a malformed token', function () {
            const token = 'invalid_token';
            const result = tokenProvider.validate(token);

            result.should.be.false();
        });

        it('should fail to verify a token with an invalid signature', function () {
            const token = tokenProvider.create();
            const [timestamp, nonce] = token.split(':');
            const invalidDigest = 'a'.repeat(64); // Create an invalid digest
            const invalidToken = `${timestamp}:${nonce}:${invalidDigest}`;

            const result = tokenProvider.validate(invalidToken);

            result.should.be.false();
        });
    });
});
