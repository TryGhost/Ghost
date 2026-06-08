const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const TokenService = require('../../../../../../../core/server/services/members/members-api/services/token-service');

describe('TokenService', function () {
    let tokenService;
    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQCea7oriNoFgxnY/JgFDpNRlxLMVIapfoMQTCJMWkH9pDYoAq/8GF6q0yTd\nn5+AS7TGasCjgNGW6miEbBDBaQy8hS8hWqhaRKY6Sy8/11KyAC8y5cs+QW4dFY2JvnXO6UpE\nFaTtHR7oAtTSZJ9D9i/FN+2wAoO/4193Leoqqw1dJwIDAQABAoGAeqejo5M4Yi4n9AVV2gx3\n6SLTrhn/jPljllmr8HutPilGuOGjycZAfXguwdyVjKqQ01LRxYW2QGdK9sQIkQa5kXjzTtLa\ndtHYcplk0rTTsdjbvZ31AKNTNYn5s+PhGGb0Gc9n8co18K75ol8VPG8lpXjUUCWsb2xcV7wA\nQuHkOukCQQD7TluL8I4tHXzREIW3OZeLTyRlPEIn5cDdPPEIHrAIu4WJ50zAbkMH7W4HBmWf\ntafxSgWcRsdMIZn//wZV3goLAkEAoWE6/LgKgowSouIjbRdekw7QPZMvN2LUV0a0GZHpSA2K\nzzyvOsW1dU9EO+WhCpdfoikuxWiPtN+byAe2sbBG1QJALuKgm8wmim488jhV6ig5iMkcLjL+\n2Li5sc0D3xLynr51nJPlsuUfZmQ6qd7cqN5YVeEMiOp/lkmSlLs8sFp7nwJAKEkFWKD4vq4I\n2PBqt4jl6v//q99aIhFhwIe93cQ23+3BgQo9FAbWzXoEJo+kK+itzuVI766ycQyA7uY+DQ1c\nIQJAER3D4lsY5wnE+01eqk8NfF7TO+u4ezWs/rmNyn3hapskgV0xqn+FanXeVJ5K7B3AzabR\na4/tLo88gWEfcow6WQ==\n-----END RSA PRIVATE KEY-----\n';
    const publicKey = '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAJ5ruiuI2gWDGdj8mAUOk1GXEsxUhql+gxBMIkxaQf2kNigCr/wYXqrTJN2fn4BL\ntMZqwKOA0ZbqaIRsEMFpDLyFLyFaqFpEpjpLLz/XUrIALzLlyz5Bbh0VjYm+dc7pSkQVpO0d\nHugC1NJkn0P2L8U37bACg7/jX3ct6iqrDV0nAgMBAAE=\n-----END RSA PUBLIC KEY-----\n';
    const issuer = 'http://127.0.0.1:2369/members/api';

    beforeAll(function () {
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

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'scope', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
            assert.equal(decodedToken.scope, 'members:identity');
        });
    });

    describe('encodeEntitlementToken', function () {
        it('can encode an entitlement token and verify it afterwards', async function () {
            const token = await tokenService.encodeEntitlementToken({
                sub: 'member@example.com',
                memberUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                paid: true,
                activeTierIds: ['tier_1', 'tier_2']
            });

            // Entitlement tokens are consumed by external integrations that verify
            // against the published public keys, not via decodeToken (see below).
            const jwks = await tokenService.getPublicKeys();
            const entitlementPublicKey = jwkToPem(jwks.keys[0]);
            const decodedToken = jwt.verify(token, entitlementPublicKey, {
                algorithms: ['RS512'],
                issuer: 'http://127.0.0.1:2369/members/api'
            });

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

    describe('decodeToken', function () {
        it('accepts an identity token', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const decodedToken = await tokenService.decodeToken(token);

            assert.equal(decodedToken.sub, 'member@example.com');
            assert.equal(decodedToken.scope, 'members:identity');
        });

        it('rejects an entitlement token used as a member identity', async function () {
            const token = await tokenService.encodeEntitlementToken({
                sub: 'member@example.com',
                memberUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                paid: true,
                activeTierIds: ['tier_1', 'tier_2']
            });

            await assert.rejects(
                tokenService.decodeToken(token),
                /Only identity tokens can act as a member/
            );
        });

        it('rejects a token without the identity scope', async function () {
            // Any token not scoped `members:identity` - including a scopeless
            // token signed with the same key - must not act as a member.
            const token = jwt.sign(
                {sub: 'member@example.com'},
                privateKey,
                {algorithm: 'RS512', audience: issuer, issuer}
            );

            await assert.rejects(
                tokenService.decodeToken(token),
                /Only identity tokens can act as a member/
            );
        });
    });

    describe('getPublicKeys', function () {
        it('can verify the token using public keys', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const jwks = await tokenService.getPublicKeys();
            const verificationKey = jwkToPem(jwks.keys[0]);

            const decodedToken = jwt.verify(token, verificationKey, {
                algorithms: ['RS512']
            });

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'scope', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
        });
    });
});
