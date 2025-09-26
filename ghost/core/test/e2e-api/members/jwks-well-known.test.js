const crypto = require('crypto');
const should = require('should');
const {agentProvider, mockManager} = require('../../utils/e2e-framework');

describe('Members .well-known JWKS Key Validation', function () {
    // Increase timeout - validating 2048-bit keys takes longer
    this.timeout(10000);

    let membersAgent;

    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        mockManager.mockMail();
    });

    after(function () {
        mockManager.restore();
    });

    describe('GET /jwks.json - Key Size Validation', function () {
        it('should return a JWKS with 2048-bit RSA keys', async function () {
            const response = await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200);

            const jwks = response.body;

            should.exist(jwks);
            should.exist(jwks.keys);
            jwks.keys.should.be.an.Array();
            jwks.keys.length.should.be.above(0);

            // Validate each key in the JWKS
            for (const jwk of jwks.keys) {
                // Check required JWK properties for RSA keys
                should.exist(jwk.kty);
                should.exist(jwk.n);
                should.exist(jwk.e);
                should.exist(jwk.kid);

                jwk.kty.should.equal('RSA');

                // The 'use' property is optional in JWK spec
                // Some endpoints add it, some don't
                if (jwk.use) {
                    jwk.use.should.equal('sig');
                }

                // Decode the modulus to check key size
                const modulusBuffer = Buffer.from(jwk.n, 'base64url');

                // The modulus for a 2048-bit RSA key should be 256 bytes (2048 bits / 8)
                // Allow for some padding in the encoding
                modulusBuffer.length.should.be.aboveOrEqual(255, 'RSA key modulus should be at least 2048 bits');
                modulusBuffer.length.should.be.belowOrEqual(257, 'RSA key modulus should be around 2048 bits');
            }
        });

        it('should work with strict jose library for RS512 JWT validation', async function () {
            const jose = require('node-jose');

            const response = await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200);

            const jwks = response.body;

            // This would throw an error if the keys don't meet jose's strict requirements
            // (e.g., if they were 1024-bit instead of 2048-bit)
            let keyStore;
            try {
                keyStore = await jose.JWK.asKeyStore(jwks);
            } catch (err) {
                should.fail(`JWKS should be valid for strict jose library: ${err.message}`);
            }

            // Verify we got valid keys
            const keys = keyStore.all();
            keys.should.be.an.Array();
            keys.length.should.be.above(0);

            for (const key of keys) {
                key.kty.should.equal('RSA');

                // Get the public key in PEM format and verify it's 2048-bit
                const publicKeyPem = key.toPEM();
                publicKeyPem.should.match(/^-----BEGIN PUBLIC KEY-----/);

                const publicKeyObj = crypto.createPublicKey({
                    key: publicKeyPem,
                    format: 'pem'
                });

                // Verify the modulus length is 2048 bits (required for RS512)
                const keyDetails = publicKeyObj.asymmetricKeyDetails;
                keyDetails.modulusLength.should.equal(2048, 'JWKS keys should be 2048 bits for RS512 compatibility');
            }
        });

        it('should return consistent JWKS on multiple requests', async function () {
            const response1 = await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200);

            const response2 = await membersAgent
                .get('/.well-known/jwks.json')
                .expectStatus(200);

            should.deepEqual(response1.body.keys[0].n, response2.body.keys[0].n);
            should.deepEqual(response1.body.keys[0].e, response2.body.keys[0].e);
            should.deepEqual(response1.body.keys[0].kid, response2.body.keys[0].kid);
        });
    });
});