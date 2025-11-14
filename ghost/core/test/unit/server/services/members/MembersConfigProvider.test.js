const should = require('should');
const sinon = require('sinon');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const MembersConfigProvider = require('../../../../../core/server/services/members/MembersConfigProvider');

describe('MembersConfigProvider - Key Generation Integration', function () {
    // Increase timeout for all tests - 2048-bit key generation takes longer than default 2000ms
    this.timeout(10000);

    let membersConfigProvider;
    let settingsCache;

    beforeEach(function () {
        settingsCache = {
            get: sinon.stub()
        };

        const urlUtils = {
            urlFor: sinon.stub().returns('http://example.com/members/api')
        };

        membersConfigProvider = new MembersConfigProvider({
            settingsCache,
            urlUtils,
            config: {},
            logging: {warn: sinon.stub()}
        });
    });

    describe('getTokenConfig - Fallback Key Generation', function () {
        beforeEach(function () {
            // Simulate missing keys in settings (what happens before populateDefaults)
            // This is the core scenario we're testing - when database keys are unavailable
            settingsCache.get.withArgs('members_private_key').returns(null);
            settingsCache.get.withArgs('members_public_key').returns(null);
        });

        it('should generate 2048-bit fallback keys when settings keys are missing', function () {
            const config = membersConfigProvider.getTokenConfig();

            should.exist(config.privateKey);
            should.exist(config.publicKey);
            should.exist(config.issuer);

            // Verify they are valid RSA keys
            config.publicKey.should.match(/^-----BEGIN RSA PUBLIC KEY-----/);
            config.privateKey.should.match(/^-----BEGIN RSA PRIVATE KEY-----/);

            // Use crypto to verify the key size
            const publicKeyObj = crypto.createPublicKey({
                key: config.publicKey,
                format: 'pem'
            });

            // Verify the modulus length is 2048 bits
            const keyDetails = publicKeyObj.asymmetricKeyDetails;
            keyDetails.modulusLength.should.equal(2048, 'Fallback keys should be 2048 bits');
        });

        it('should generate fallback keys that work with RS512 JWT signing', function () {
            const config = membersConfigProvider.getTokenConfig();

            // Test JWT signing with RS512 (what Ghost members API uses)
            const payload = {
                sub: 'member@example.com',
                iat: Math.floor(Date.now() / 1000)
            };

            // Sign a JWT with RS512
            const token = jwt.sign(payload, config.privateKey, {
                algorithm: 'RS512',
                expiresIn: '10m',
                issuer: config.issuer,
                audience: config.issuer
            });

            // Verify the token with the public key
            const decoded = jwt.verify(token, config.publicKey, {
                algorithms: ['RS512'],
                issuer: config.issuer
            });

            decoded.sub.should.equal('member@example.com');
        });

        it('should generate valid key pairs that work together for signing and verification', function () {
            const config = membersConfigProvider.getTokenConfig();
            const testData = 'test member JWT payload';
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(testData);
            sign.end();

            const signature = sign.sign(config.privateKey);

            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(testData);
            verify.end();

            const isValid = verify.verify(config.publicKey, signature);
            isValid.should.equal(true, 'Generated fallback keys should work as a valid pair');
        });

        it('should work with jose library for strict JWKS validation', async function () {
            const jose = require('node-jose');
            const config = membersConfigProvider.getTokenConfig();

            // Create JWKS from the private key (what would be served at /members/.well-known/jwks.json)
            const keyStore = jose.JWK.createKeyStore();
            const jwk = await keyStore.add(config.privateKey, 'pem');

            const testToken = jwt.sign(
                {sub: 'test-member'},
                config.privateKey,
                {
                    algorithm: 'RS512',
                    keyid: jwk.kid,
                    issuer: config.issuer,
                    audience: config.issuer
                }
            );

            const jwks = keyStore.toJSON();
            const publicKeyFromJwks = await jose.JWK.asKey(jwks.keys[0]);

            const verifier = jose.JWS.createVerify(publicKeyFromJwks);
            const result = await verifier.verify(testToken);

            const payload = JSON.parse(result.payload.toString());
            payload.sub.should.equal('test-member');
        });

        it('should log a warning when generating fallback keys', function () {
            const loggingModule = require('@tryghost/logging');
            const warnStub = sinon.stub(loggingModule, 'warn');

            try {
                const provider = new MembersConfigProvider({
                    settingsCache,
                    urlUtils: {urlFor: sinon.stub().returns('http://example.com')},
                    config: {},
                    logging: {warn: sinon.stub()}
                });

                provider.getTokenConfig();

                warnStub.calledOnce.should.be.true();
                warnStub.firstCall.args[0].should.match(/Could not find members_private_key/);
            } finally {
                warnStub.restore();
            }
        });
    });
});