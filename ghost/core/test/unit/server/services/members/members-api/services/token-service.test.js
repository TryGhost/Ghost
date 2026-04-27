const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const TokenService = require('../../../../../../../core/server/services/members/members-api/services/token-service');

describe('TokenService', function () {
    let tokenService;

    before(function () {
        const {privateKey, publicKey} = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'pkcs1', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs1', format: 'pem'}
        });
        const issuer = 'http://127.0.0.1:2369/members/api';

        tokenService = new TokenService({
            privateKey,
            publicKey,
            issuer
        });
    });

    describe('encodeIdentityToken', function () {
        it('can encode a token and decode it afterwards', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const decodedToken = await tokenService.decodeToken(token);

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
        });
    });

    describe('encodeEntitlementToken', function () {
        it('can encode an entitlement token and decode it afterwards', async function () {
            const token = await tokenService.encodeEntitlementToken({
                sub: 'member@example.com',
                memberUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                paid: true,
                activeTierIds: ['tier_1', 'tier_2']
            });
            const decodedToken = await tokenService.decodeToken(token);

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'scope', 'member_uuid', 'paid', 'active_tier_ids', 'jti', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
            assert.equal(decodedToken.scope, 'members:entitlements:read');
            assert.equal(decodedToken.member_uuid, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
            assert.equal(decodedToken.paid, true);
            assert.deepEqual(decodedToken.active_tier_ids, ['tier_1', 'tier_2']);
            assert.equal(typeof decodedToken.jti, 'string');
            assert.equal(decodedToken.exp - decodedToken.iat, 300);
        });
    });

    describe('getPublicKeys', function () {
        it('can verify the token using public keys', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const jwks = await tokenService.getPublicKeys();
            const publicKey = jwkToPem(jwks.keys[0]);

            const decodedToken = jwt.verify(token, publicKey, {
                algorithms: ['RS512'],
                issuer: this._issuer
            });

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
        });
    });
});
