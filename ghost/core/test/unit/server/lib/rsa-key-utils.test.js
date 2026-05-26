const assert = require('node:assert/strict');
const crypto = require('crypto');
const keypair = require('keypair');
const {
    RSA_KEY_BITS_FOR_RS512,
    getRsaModulusLength,
    isRsaKeyCompatibleWithRS512
} = require('../../../../core/server/lib/rsa-key-utils');

describe('rsa-key-utils', function () {
    it('reports 2048-bit keys as RS512 compatible', function () {
        const {public: publicKey} = keypair({bits: RSA_KEY_BITS_FOR_RS512});

        assert.equal(getRsaModulusLength(publicKey), 2048);
        assert.equal(isRsaKeyCompatibleWithRS512(publicKey), true);
    });

    it('reports 1024-bit keys as incompatible with RS512', function () {
        const {public: publicKey} = keypair({bits: 1024});

        assert.equal(getRsaModulusLength(publicKey), 1024);
        assert.equal(isRsaKeyCompatibleWithRS512(publicKey), false);
    });

    it('returns 0 for invalid PEM input', function () {
        assert.equal(getRsaModulusLength('not-a-key'), 0);
        assert.equal(isRsaKeyCompatibleWithRS512('not-a-key'), false);
    });

    it('accepts SPKI public keys', function () {
        const {privateKey, publicKey} = crypto.generateKeyPairSync('rsa', {
            modulusLength: RSA_KEY_BITS_FOR_RS512,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
        });

        assert.equal(getRsaModulusLength(publicKey), 2048);
        assert.equal(isRsaKeyCompatibleWithRS512(publicKey), true);
        assert.ok(privateKey.includes('BEGIN PRIVATE KEY'));
    });
});
