const should = require('should');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');

describe('Settings Model - RSA Key Generation Implementation', function () {
    before(async function () {
        models.init();
        await testUtils.startGhost();
    });

    afterEach(async function () {
        await testUtils.teardownDb();
    });

    describe('Default Settings Population', function () {
        // Helper function to retrieve key settings from database
        async function getKeySettings(privateKeyName, publicKeyName) {
            const privateKeySetting = await models.Settings.findOne({key: privateKeyName});
            const publicKeySetting = await models.Settings.findOne({key: publicKeyName});

            should.exist(privateKeySetting, `${privateKeyName} should exist`);
            should.exist(publicKeySetting, `${publicKeyName} should exist`);

            return {
                privateKey: privateKeySetting.get('value'),
                publicKey: publicKeySetting.get('value'),
                privateKeySetting,
                publicKeySetting
            };
        }

        // Helper function to verify RSA key validity and size
        function verifyRSAKeys(privateKey, publicKey, expectedBits = 2048, keyType = '') {
            // Verify they are valid RSA keys
            privateKey.should.match(/^-----BEGIN RSA PRIVATE KEY-----/, `${keyType} private key should be valid RSA format`);
            publicKey.should.match(/^-----BEGIN RSA PUBLIC KEY-----/, `${keyType} public key should be valid RSA format`);

            // Use crypto to verify the key size
            const publicKeyObj = crypto.createPublicKey({
                key: publicKey,
                format: 'pem'
            });

            // Verify the modulus length
            const keyDetails = publicKeyObj.asymmetricKeyDetails;
            keyDetails.modulusLength.should.equal(expectedBits, `${keyType} keys should be ${expectedBits} bits`);
        }

        beforeEach(async function () {
            // Populate default settings - this is what happens on Ghost startup
            await models.Settings.populateDefaults();
        });

        it('should generate 2048-bit RSA keys for ghost_private_key and ghost_public_key', async function () {
            const {privateKey, publicKey} = await getKeySettings('ghost_private_key', 'ghost_public_key');
            verifyRSAKeys(privateKey, publicKey, 2048, 'Ghost');
        });

        it('should generate 2048-bit RSA keys for members_private_key and members_public_key', async function () {
            const {privateKey, publicKey} = await getKeySettings('members_private_key', 'members_public_key');
            verifyRSAKeys(privateKey, publicKey, 2048, 'Members');
        });

        it('should generate keys that work with RS512 JWT signing', async function () {
            const {privateKey, publicKey} = await getKeySettings('ghost_private_key', 'ghost_public_key');

            const payload = {
                sub: 'test-user',
                iat: Math.floor(Date.now() / 1000)
            };

            // Sign a JWT with RS512
            const token = jwt.sign(payload, privateKey, {
                algorithm: 'RS512',
                expiresIn: '10m',
                issuer: 'ghost-test'
            });

            // Verify the token with the public key
            const decoded = jwt.verify(token, publicKey, {
                algorithms: ['RS512'],
                issuer: 'ghost-test'
            });

            decoded.sub.should.equal('test-user');
        });

        it('should generate different keys for ghost and members settings', async function () {
            const ghostKeys = await getKeySettings('ghost_private_key', 'ghost_public_key');
            const membersKeys = await getKeySettings('members_private_key', 'members_public_key');

            // Keys should be different
            ghostKeys.privateKey.should.not.equal(membersKeys.privateKey);
            ghostKeys.publicKey.should.not.equal(membersKeys.publicKey);
        });

        it('should not regenerate keys when populateDefaults is called again', async function () {
            // Get initial keys (populateDefaults already called in beforeEach)
            const firstGhostPrivateKey = await models.Settings.findOne({key: 'ghost_private_key'});
            const firstValue = firstGhostPrivateKey.get('value');

            await models.Settings.populateDefaults();

            const secondGhostPrivateKey = await models.Settings.findOne({key: 'ghost_private_key'});
            const secondValue = secondGhostPrivateKey.get('value');

            secondValue.should.equal(firstValue, 'Keys should not be regenerated on subsequent populateDefaults calls');
        });

        // jose is a common library used to validate JWKS
        it('should work with strict jose library for JWKS validation', async function () {
            const {privateKey} = await getKeySettings('ghost_private_key', 'ghost_public_key');

            // This is what the well-known.js endpoint does
            const keyStore = jose.JWK.createKeyStore();
            const jwk = await keyStore.add(privateKey, 'pem');

            // Get the public JWKS
            const jwks = keyStore.toJSON();

            should.exist(jwks.keys);
            jwks.keys.length.should.equal(1);

            // The key should have the correct properties
            const publicJwk = jwks.keys[0];
            should.exist(publicJwk.n); // modulus
            should.exist(publicJwk.e); // exponent
            publicJwk.kty.should.equal('RSA');

            // This would fail with 1024-bit keys in strict libraries
            const testToken = jwt.sign({sub: 'test'}, privateKey, {
                algorithm: 'RS512',
                keyid: jwk.kid
            });

            // Convert JWK to PEM for verification
            const publicKeyFromJwk = await jose.JWK.asKey(publicJwk);
            const publicPem = publicKeyFromJwk.toPEM();

            const decoded = jwt.verify(testToken, publicPem, {
                algorithms: ['RS512']
            });

            decoded.sub.should.equal('test');
        });
    });
});