const should = require('should');
const sinon = require('sinon');
const crypto = require('crypto');
const MembersConfigProvider = require('../../../../../core/server/services/members/MembersConfigProvider');

describe('MembersConfigProvider - Fallback Key Generation', function () {
    // Increase timeout for key generation tests
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

    describe('getTokenConfig', function () {
        it('should generate 2048-bit fallback keys when settings keys are missing', function () {
            // Simulate missing keys in settings
            settingsCache.get.withArgs('members_private_key').returns(null);
            settingsCache.get.withArgs('members_public_key').returns(null);

            const config = membersConfigProvider.getTokenConfig();

            should.exist(config.privateKey);
            should.exist(config.publicKey);

            // Verify they are valid RSA keys
            config.publicKey.should.match(/^-----BEGIN RSA PUBLIC KEY-----/);
            config.privateKey.should.match(/^-----BEGIN RSA PRIVATE KEY-----/);

            // Use crypto to verify the key size
            const publicKeyObj = crypto.createPublicKey({
                key: config.publicKey,
                format: 'pem'
            });

            // Get key details - modulusLength is in bits
            const keyDetails = publicKeyObj.asymmetricKeyDetails;
            keyDetails.modulusLength.should.equal(2048, 'Fallback keys should be 2048 bits');
        });

        it('should use settings keys when available', function () {
            // Mock keys from settings (don't actually generate them for speed)
            const mockPrivateKey = '-----BEGIN RSA PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END RSA PRIVATE KEY-----';
            const mockPublicKey = '-----BEGIN RSA PUBLIC KEY-----\nMOCK_PUBLIC_KEY\n-----END RSA PUBLIC KEY-----';

            settingsCache.get.withArgs('members_private_key').returns(mockPrivateKey);
            settingsCache.get.withArgs('members_public_key').returns(mockPublicKey);

            const config = membersConfigProvider.getTokenConfig();

            // Should use the keys from settings, not generate new ones
            config.privateKey.should.equal(mockPrivateKey);
            config.publicKey.should.equal(mockPublicKey);
        });

        it('should generate valid key pairs that work together', function () {
            // Simulate missing keys to trigger fallback generation
            settingsCache.get.withArgs('members_private_key').returns(null);
            settingsCache.get.withArgs('members_public_key').returns(null);

            const config = membersConfigProvider.getTokenConfig();

            // Test that we can sign with private and verify with public
            const testData = 'test JWT payload';
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

        it('should warn when generating fallback keys', function () {
            // Stub the global logging module
            const loggingModule = require('@tryghost/logging');
            const warnStub = sinon.stub(loggingModule, 'warn');

            // Simulate missing keys
            settingsCache.get.withArgs('members_private_key').returns(null);
            settingsCache.get.withArgs('members_public_key').returns(null);

            const provider = new MembersConfigProvider({
                settingsCache,
                urlUtils: {urlFor: sinon.stub().returns('http://example.com')},
                config: {},
                logging: {warn: sinon.stub()} // Still pass this but it won't be used
            });

            provider.getTokenConfig();

            // Should log a warning about using dynamically generated keypair
            warnStub.calledOnce.should.be.true();
            warnStub.firstCall.args[0].should.match(/Could not find members_private_key/);

            // Restore the stub
            warnStub.restore();
        });
    });
});