const assert = require('assert/strict');
const {createOTCVerificationHash, REQUIRED_SECRET_LENGTH} = require('../../../../../core/server/services/members/otc-hash-utils');

describe('otc-hash-utils', function () {
    const VALID_SECRET = 'a'.repeat(REQUIRED_SECRET_LENGTH * 2); // hex length
    const TOKEN = 'test-token-value';
    const OTC = '123456';
    const TIMESTAMP = 1700000000;

    it('creates deterministic HMAC for same inputs', function () {
        const firstHash = createOTCVerificationHash(OTC, TOKEN, TIMESTAMP, VALID_SECRET);
        const secondHash = createOTCVerificationHash(OTC, TOKEN, TIMESTAMP, VALID_SECRET);
        assert.equal(firstHash, secondHash);
        assert.match(firstHash, /^[a-f0-9]{64}$/i);
    });

    it('produces different hashes when OTC differs', function () {
        const firstHash = createOTCVerificationHash('111111', TOKEN, TIMESTAMP, VALID_SECRET);
        const secondHash = createOTCVerificationHash('222222', TOKEN, TIMESTAMP, VALID_SECRET);
        assert.notEqual(firstHash, secondHash);
    });

    it('produces different hashes when token differs', function () {
        const firstHash = createOTCVerificationHash(OTC, 'token-a', TIMESTAMP, VALID_SECRET);
        const secondHash = createOTCVerificationHash(OTC, 'token-b', TIMESTAMP, VALID_SECRET);
        assert.notEqual(firstHash, secondHash);
    });

    it('produces different hashes when timestamp differs', function () {
        const firstHash = createOTCVerificationHash(OTC, TOKEN, 1700000000, VALID_SECRET);
        const secondHash = createOTCVerificationHash(OTC, TOKEN, 1700001000, VALID_SECRET);
        assert.notEqual(firstHash, secondHash);
    });

    it('throws when secret is missing', function () {
        assert.throws(() => createOTCVerificationHash(OTC, TOKEN, TIMESTAMP, undefined), /Authentication secret not configured/);
    });

    it('throws when secret is too short', function () {
        const shortSecret = 'a'.repeat((REQUIRED_SECRET_LENGTH - 1) * 2);
        assert.throws(() => createOTCVerificationHash(OTC, TOKEN, TIMESTAMP, shortSecret), /Authentication secret not properly configured/);
    });
});

