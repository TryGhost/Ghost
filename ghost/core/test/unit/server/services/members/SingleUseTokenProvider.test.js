const sinon = require('sinon');
const assert = require('assert/strict');

const SingleUseTokenProvider = require('../../../../../core/server/services/members/SingleUseTokenProvider');

describe('SingleUseTokenProvider', function () {
    let tokenProvider;
    let mockMembersConfig;
    let mockModel;
    const testAuthSecret = 'abc123';

    beforeEach(function () {
        mockMembersConfig = {
            getAuthSecret: sinon.stub().returns(testAuthSecret)
        };

        mockModel = {
            add: sinon.stub(),
            findOne: sinon.stub(),
            transaction: sinon.stub()
        };

        tokenProvider = new SingleUseTokenProvider({
            SingleUseTokenModel: mockModel,
            validityPeriod: 86400000, // 24 hours
            validityPeriodAfterUsage: 3600000, // 1 hour
            maxUsageCount: 3,
            secret: mockMembersConfig.getAuthSecret()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('deriveOTC', function () {
        const testToken = {
            id: 'test-token-id',
            token: 'test-token-value'
        };

        it('should generate a 6-digit code', function () {
            const code = tokenProvider.deriveOTC(testToken.id, testToken.token);
            
            assert.equal(typeof code, 'string');
            assert.match(code, /^\d{6}$/);
        });

        it('should generate consistent codes for the same token', function () {
            const code1 = tokenProvider.deriveOTC(testToken.id, testToken.token);
            const code2 = tokenProvider.deriveOTC(testToken.id, testToken.token);
            
            assert.equal(code1, code2);
        });

        it('should generate different codes for different tokens', function () {
            const token1 = {id: 'token-1', token: 'value-1'};
            const token2 = {id: 'token-2', token: 'value-2'};
            
            const code1 = tokenProvider.deriveOTC(token1.id, token1.token);
            const code2 = tokenProvider.deriveOTC(token2.id, token2.token);
            
            assert.notEqual(code1, code2);
        });

        it('should generate different codes for same id with different token values', function () {
            const token1 = {id: 'same-id', token: 'value-1'};
            const token2 = {id: 'same-id', token: 'value-2'};
            
            const code1 = tokenProvider.deriveOTC(token1.id, token1.token);
            const code2 = tokenProvider.deriveOTC(token2.id, token2.token);
            
            assert.notEqual(code1, code2);
        });

        it('should generate different codes for same token value with different ids', function () {
            const token1 = {id: 'id-1', token: 'same-value'};
            const token2 = {id: 'id-2', token: 'same-value'};
            
            const code1 = tokenProvider.deriveOTC(token1.id, token1.token);
            const code2 = tokenProvider.deriveOTC(token2.id, token2.token);
            
            assert.notEqual(code1, code2);
        });

        it('throws if secret is not configured', function () {
            const providerNoSecret = new SingleUseTokenProvider({
                SingleUseTokenModel: mockModel,
                validityPeriod: 86400000,
                validityPeriodAfterUsage: 3600000,
                maxUsageCount: 3
            });
            assert.throws(() => {
                providerNoSecret.deriveOTC('id', 'value');
            }, /secret not configured/i);
        });

        it('throws if tokenId or tokenValue is missing', function () {
            assert.throws(() => tokenProvider.deriveOTC('', 'value'), /tokenId and tokenValue are required/i);
            assert.throws(() => tokenProvider.deriveOTC('id', ''), /tokenId and tokenValue are required/i);
        });
    });
});