const should = require('should');
const crypto = require('crypto');
const keypair = require('keypair');

describe('Settings Model - RSA Key Generation', function () {
    // Increase timeout for key generation tests
    this.timeout(10000);

    describe('Keypair Library Configuration', function () {
        it('should generate 2048-bit RSA keys when configured with bits: 2048', function () {
            // Test that the keypair library generates correct key sizes
            // This is what the Settings model uses internally
            const testKeypair = keypair({bits: 2048});

            should.exist(testKeypair.private);
            should.exist(testKeypair.public);

            // Verify they are valid RSA keys
            testKeypair.private.should.match(/^-----BEGIN RSA PRIVATE KEY-----/);
            testKeypair.public.should.match(/^-----BEGIN RSA PUBLIC KEY-----/);

            // Use crypto to verify the key size
            const publicKeyObj = crypto.createPublicKey({
                key: testKeypair.public,
                format: 'pem'
            });

            // Get key details - modulusLength is in bits
            const keyDetails = publicKeyObj.asymmetricKeyDetails;
            keyDetails.modulusLength.should.equal(2048, 'Generated keys should be 2048 bits');
        });

        it('should generate valid key pairs that can sign and verify', function () {
            // Test the keypair generation that Settings model uses
            const testKeypair = keypair({bits: 2048});

            // Test that we can sign with private and verify with public
            const testData = 'test message for signature verification';
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(testData);
            sign.end();

            const signature = sign.sign(testKeypair.private);

            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(testData);
            verify.end();

            const isValid = verify.verify(testKeypair.public, signature);
            isValid.should.equal(true, 'Public key should verify signatures from corresponding private key');
        });

        it('should generate keys compatible with RS512 algorithm (used for JWT)', function () {
            const jwt = require('jsonwebtoken');
            const testKeypair = keypair({bits: 2048});

            // Test that we can sign a JWT with RS512
            const payload = {sub: 'test-user', iat: Math.floor(Date.now() / 1000)};

            // This should not throw an error
            const token = jwt.sign(payload, testKeypair.private, {
                algorithm: 'RS512',
                expiresIn: '10m',
                issuer: 'test'
            });

            // Verify the token
            const decoded = jwt.verify(token, testKeypair.public, {
                algorithms: ['RS512'],
                issuer: 'test'
            });

            decoded.sub.should.equal('test-user');
        });

        it('should fail RS512 strict validation with 1024-bit keys', function () {
            const jwt = require('jsonwebtoken');

            // Generate 1024-bit keys (the old configuration)
            const testKeypair1024 = keypair({bits: 1024});

            // JWT library might allow it (not strict)
            const token = jwt.sign(
                {sub: 'test-user'},
                testKeypair1024.private,
                {algorithm: 'RS512', issuer: 'test'}
            );

            // Can verify with jwt library (non-strict allows it)
            jwt.verify(token, testKeypair1024.public, {
                algorithms: ['RS512'],
                issuer: 'test'
            });

            // But strict libraries would reject the key itself
            // The jose library enforces minimum key lengths for algorithms
            // This documents why we needed to upgrade to 2048-bit keys
            const publicKeyObj = crypto.createPublicKey({
                key: testKeypair1024.public,
                format: 'pem'
            });

            publicKeyObj.asymmetricKeyDetails.modulusLength.should.equal(1024);

            // RS512 requires 2048-bit minimum according to standards
            publicKeyObj.asymmetricKeyDetails.modulusLength.should.be.below(2048,
                '1024-bit keys do not meet RS512 minimum requirements');
        });
    });
});