const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {generateKeyPair, restoreKeyPair, buildProof} = require('../../../../../core/server/services/atproto-auth/dpop-helper');

describe('DPopHelper', function () {
    describe('generateKeyPair', function () {
        it('returns private key, JWK string, and public JWK', function () {
            const kp = generateKeyPair();
            assert.ok(kp.privateKey instanceof crypto.KeyObject);
            assert.ok(typeof kp.privateKeyJwk === 'string');
            assert.ok(typeof kp.publicKeyJwk === 'object');
            assert.equal(kp.publicKeyJwk.kty, 'EC');
            assert.equal(kp.publicKeyJwk.crv, 'P-256');
        });

        it('public JWK does not contain the private key scalar d', function () {
            const {publicKeyJwk} = generateKeyPair();
            assert.ok(!('d' in publicKeyJwk), 'public JWK must not expose d');
        });

        it('generates a unique keypair each call', function () {
            const kp1 = generateKeyPair();
            const kp2 = generateKeyPair();
            assert.notEqual(kp1.privateKeyJwk, kp2.privateKeyJwk);
        });
    });

    describe('restoreKeyPair', function () {
        it('restores a keypair from serialised JWK', function () {
            const original = generateKeyPair();
            const restored = restoreKeyPair(original.privateKeyJwk);
            assert.deepEqual(restored.publicKeyJwk, original.publicKeyJwk);
        });

        it('throws on invalid JWK JSON', function () {
            assert.throws(() => restoreKeyPair('not json'));
        });
    });

    describe('buildProof', function () {
        it('returns a 3-part compact JWT', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const proof = buildProof(privateKey, publicKeyJwk, 'POST', 'https://bsky.social/oauth/token');
            const parts = proof.split('.');
            assert.equal(parts.length, 3);
        });

        it('sets correct header claims', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const proof = buildProof(privateKey, publicKeyJwk, 'POST', 'https://example.com/token');
            const header = JSON.parse(Buffer.from(proof.split('.')[0], 'base64url').toString());
            assert.equal(header.typ, 'dpop+jwt');
            assert.equal(header.alg, 'ES256');
            assert.ok(header.jwk, 'header should embed public JWK');
            assert.ok(!('d' in header.jwk), 'embedded JWK must not contain private key');
        });

        it('sets correct payload claims', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const url = 'https://example.com/token';
            const proof = buildProof(privateKey, publicKeyJwk, 'POST', url);
            const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());
            assert.equal(payload.htm, 'POST');
            assert.equal(payload.htu, url);
            assert.ok(typeof payload.jti === 'string');
            assert.ok(typeof payload.iat === 'number');
        });

        it('strips query and fragment from htu', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const proof = buildProof(privateKey, publicKeyJwk, 'GET', 'https://example.com/token?foo=bar#hash');
            const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());
            assert.equal(payload.htu, 'https://example.com/token');
        });

        it('includes nonce when provided', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const proof = buildProof(privateKey, publicKeyJwk, 'POST', 'https://example.com/token', 'server-nonce-123');
            const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());
            assert.equal(payload.nonce, 'server-nonce-123');
        });

        it('omits nonce when not provided', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const proof = buildProof(privateKey, publicKeyJwk, 'POST', 'https://example.com/token');
            const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());
            assert.ok(!('nonce' in payload));
        });

        it('generates unique jti values', function () {
            const {privateKey, publicKeyJwk} = generateKeyPair();
            const p1 = buildProof(privateKey, publicKeyJwk, 'POST', 'https://example.com/token');
            const p2 = buildProof(privateKey, publicKeyJwk, 'POST', 'https://example.com/token');
            const jti1 = JSON.parse(Buffer.from(p1.split('.')[1], 'base64url').toString()).jti;
            const jti2 = JSON.parse(Buffer.from(p2.split('.')[1], 'base64url').toString()).jti;
            assert.notEqual(jti1, jti2);
        });
    });
});
