const assert = require('node:assert/strict');
const crypto = require('crypto');
const {agentProvider, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyString, anyEtag} = matchers;
const {RSA_KEY_BITS_FOR_RS512} = require('../../../core/server/lib/rsa-key-utils');

describe('Members .well-known', function () {
    let membersAgent;

    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        mockManager.mockMail();
    });

    after(function () {
        mockManager.restore();
    });

    describe('GET /jwks.json', function () {
        it('should return a JWKS', async function () {
            await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200)
                .matchBodySnapshot({
                    keys: [{
                        kid: anyString,
                        n: anyString
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('should expose RSA keys large enough for RS512 verification', async function () {
            const response = await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200);

            const jwk = response.body.keys[0];
            const modulus = Buffer.from(jwk.n, 'base64url');
            const publicKeyPem = `-----BEGIN RSA PUBLIC KEY-----\n${modulus.toString('base64')}\n-----END RSA PUBLIC KEY-----`;

            // Reconstruct from JWK n/e for accurate modulus length via Node crypto
            const jose = require('node-jose');
            const key = await jose.JWK.asKey(jwk);
            const publicKeyObj = crypto.createPublicKey({
                key: key.toPEM(),
                format: 'pem'
            });

            assert.ok(publicKeyObj.asymmetricKeyDetails);
            assert.ok(
                publicKeyObj.asymmetricKeyDetails.modulusLength >= RSA_KEY_BITS_FOR_RS512,
                `JWKS key must be at least ${RSA_KEY_BITS_FOR_RS512} bits for RS512`
            );
        });
    });
});
