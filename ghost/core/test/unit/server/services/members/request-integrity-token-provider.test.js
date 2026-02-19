const assert = require('node:assert/strict');
const sinon = require('sinon');

const RequestIntegrityTokenProvider = require('../../../../../core/server/services/members/request-integrity-token-provider');

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

            assert.equal(typeof token, 'string');
            assert(Array.isArray(token.split(':')));
            assert.equal(token.split(':').length, 3);
            const [timestamp, nonce, digest] = token.split(':');

            assert.equal(timestamp, (new Date('2021-01-01').valueOf() + 100).toString());

            assert.match(nonce, /[0-9a-f]{16}/);

            assert.equal(typeof digest, 'string');
            assert.equal(digest.length, 64);
        });
    });

    describe('validate', function () {
        it('should verify a HMAC digest from the secret', function () {
            const token = tokenProvider.create();
            const result = tokenProvider.validate(token);

            assert.equal(result, true);
        });

        it('should fail to verify an expired token', function () {
            const token = tokenProvider.create();
            sinon.clock.tick(101);
            const result = tokenProvider.validate(token);

            assert.equal(result, false);
        });

        it('should fail to verify a malformed token', function () {
            const token = 'invalid_token';
            const result = tokenProvider.validate(token);

            assert.equal(result, false);
        });

        it('should fail to verify a token with an invalid signature', function () {
            const token = tokenProvider.create();
            const [timestamp, nonce] = token.split(':');
            const invalidDigest = 'a'.repeat(64); // Create an invalid digest
            const invalidToken = `${timestamp}:${nonce}:${invalidDigest}`;

            const result = tokenProvider.validate(invalidToken);

            assert.equal(result, false);
        });
    });
});
