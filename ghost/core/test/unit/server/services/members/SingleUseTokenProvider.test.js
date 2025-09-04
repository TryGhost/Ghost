const sinon = require('sinon');
const assert = require('assert/strict');

const SingleUseTokenProvider = require('../../../../../core/server/services/members/SingleUseTokenProvider');

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;

describe('SingleUseTokenProvider', function () {
    let tokenProvider;
    let mockMembersConfig;
    let mockModel;
    const testAuthSecret = 'a'.repeat(128);

    const COMMON_TEST_TOKEN = {
        id: 'test-token-id',
        token: 'test-token-value'
    };

    beforeEach(function () {
        mockMembersConfig = {
            getAuthSecret: sinon.stub().returns(testAuthSecret)
        };

        mockModel = {
            add: sinon.stub(),
            findOne: sinon.stub(),
            transaction: sinon.stub(),
            save: sinon.stub()
        };

        tokenProvider = new SingleUseTokenProvider({
            SingleUseTokenModel: mockModel,
            validityPeriod: DAY_MS,
            validityPeriodAfterUsage: HOUR_MS,
            maxUsageCount: 7,
            secret: mockMembersConfig.getAuthSecret()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('deriveOTC', function () {
        const testToken = COMMON_TEST_TOKEN;

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
                validityPeriod: DAY_MS,
                validityPeriodAfterUsage: HOUR_MS,
                maxUsageCount: 3
            });
            assert.throws(() => {
                providerNoSecret.deriveOTC('id', 'value');
            }, {code: 'OTC_SECRET_NOT_CONFIGURED'});
        });

        it('throws if tokenId or tokenValue is missing', function () {
            assert.throws(() => tokenProvider.deriveOTC('', 'value'), {code: 'DERIVE_OTC_MISSING_INPUT'});
            assert.throws(() => tokenProvider.deriveOTC('id', ''), {code: 'DERIVE_OTC_MISSING_INPUT'});
        });
    });

    describe('getIdByToken', function () {
        it('should return the token ID', async function () {
            const testTokenValue = 'test-token-value';
            const expectedId = 'test-token-id';

            mockModel.findOne.resolves({
                get: sinon.stub().returns(expectedId)
            });

            const result = await tokenProvider.getIdByToken(testTokenValue);

            assert.equal(result, expectedId);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: testTokenValue});
        });

        it('should return null when a token does not exist', async function () {
            const testTokenValue = 'nonexistent-token';

            mockModel.findOne.resolves(null);

            const result = await tokenProvider.getIdByToken(testTokenValue);

            assert.equal(result, null);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: testTokenValue});
        });

        it('should return null when a database error occurs', async function () {
            const testTokenValue = 'test-token-value';

            mockModel.findOne.rejects(new Error('Database connection failed'));

            const result = await tokenProvider.getIdByToken(testTokenValue);

            assert.equal(result, null);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: testTokenValue});
        });

        it('should handle an empty token gracefully', async function () {
            const emptyToken = '';

            mockModel.findOne.resolves(null);

            const result = await tokenProvider.getIdByToken(emptyToken);

            assert.equal(result, null);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: emptyToken});
        });

        it('should handle an undefined token gracefully', async function () {
            const undefinedToken = undefined;

            mockModel.findOne.resolves(null);

            const result = await tokenProvider.getIdByToken(undefinedToken);

            assert.equal(result, null);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: undefinedToken});
        });

        it('should return null when model.get throws an error', async function () {
            const testTokenValue = 'test-token-value';

            mockModel.findOne.resolves({
                get: sinon.stub().throws(new Error('Model error'))
            });

            const result = await tokenProvider.getIdByToken(testTokenValue);

            assert.equal(result, null);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {token: testTokenValue});
        });
    });

    describe('verifyOTC', function () {
        const testToken = COMMON_TEST_TOKEN;

        it('should return true for valid OTC', async function () {
            const validOTC = tokenProvider.deriveOTC(testToken.id, testToken.token);

            mockModel.findOne.resolves({
                get: sinon.stub().returns(testToken.token)
            });

            const result = await tokenProvider.verifyOTC(testToken.id, validOTC);

            assert.equal(result, true);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {id: testToken.id});
        });

        it('should return false for invalid OTC', async function () {
            const invalidOTC = '123456';

            mockModel.findOne.resolves({
                get: sinon.stub().returns(testToken.token)
            });

            const result = await tokenProvider.verifyOTC(testToken.id, invalidOTC);

            assert.equal(result, false);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {id: testToken.id});
        });

        it('should return false for non-numeric OTC', async function () {
            mockModel.findOne.resolves({get: sinon.stub().returns(testToken.token)});

            const result = await tokenProvider.verifyOTC(testToken.id, '12ab56');

            assert.equal(result, false);
        });

        it('should return false when token is not found', async function () {
            const validOTC = tokenProvider.deriveOTC(testToken.id, testToken.token);

            mockModel.findOne.resolves(null);

            const result = await tokenProvider.verifyOTC('nonexistent-id', validOTC);

            assert.equal(result, false);
            sinon.assert.calledOnceWithExactly(mockModel.findOne, {id: 'nonexistent-id'});
        });

        it('should return false when secret is not configured', async function () {
            const providerNoSecret = new SingleUseTokenProvider({
                SingleUseTokenModel: mockModel,
                validityPeriod: DAY_MS,
                validityPeriodAfterUsage: HOUR_MS,
                maxUsageCount: 3
            });

            const result = await providerNoSecret.verifyOTC(testToken.id, '123456');

            assert.equal(result, false);
            sinon.assert.notCalled(mockModel.findOne);
        });

        it('should return false when tokenId is missing', async function () {
            const validOTC = tokenProvider.deriveOTC(testToken.id, testToken.token);

            const result = await tokenProvider.verifyOTC(null, validOTC);

            assert.equal(result, false);
            sinon.assert.notCalled(mockModel.findOne);
        });

        it('should return false when OTC is missing', async function () {
            const result = await tokenProvider.verifyOTC(testToken.id, null);

            assert.equal(result, false);
            sinon.assert.notCalled(mockModel.findOne);
        });

        it('should return false when tokenId is empty string', async function () {
            const validOTC = tokenProvider.deriveOTC(testToken.id, testToken.token);

            const result = await tokenProvider.verifyOTC('', validOTC);

            assert.equal(result, false);
            sinon.assert.notCalled(mockModel.findOne);
        });

        it('should return false when OTC is empty string', async function () {
            const result = await tokenProvider.verifyOTC(testToken.id, '');

            assert.equal(result, false);
            sinon.assert.notCalled(mockModel.findOne);
        });
    });

    describe('validate', function () {
        let clock;
        const testToken = COMMON_TEST_TOKEN.token;
        const testData = {user: 'test-user', email: 'test@example.com'};

        beforeEach(function () {
            clock = sinon.useFakeTimers();
        });

        afterEach(function () {
            clock.restore();
        });

        function createMockModel({
            id = COMMON_TEST_TOKEN.id,
            token = testToken,
            data = JSON.stringify(testData),
            usedCount = 0,
            firstUsedAt = null,
            createdAt = new Date()
        } = {}) {
            return {
                get: sinon.stub().callsFake((field) => {
                    switch (field) {
                    case 'id': return id;
                    case 'token': return token;
                    case 'data': return data;
                    case 'used_count': return usedCount;
                    case 'first_used_at': return firstUsedAt;
                    case 'created_at': return createdAt;
                    default: return null;
                    }
                }),
                save: sinon.stub().resolves()
            };
        }

        function setupMockModelForValidation(mockModelInstance, options = {}) {
            const transactionId = options.transactionId || 'test-transaction';
            mockModelInstance.transaction = sinon.stub().callsFake(callback => callback(transactionId));
            mockModelInstance.findOne = sinon.stub().resolves(mockModelInstance);
            tokenProvider.model = mockModelInstance;
            return mockModelInstance;
        }

        function buildModel(options = {}) {
            const model = createMockModel(options);
            return setupMockModelForValidation(model);
        }

        it('should validate a fresh token and return parsed data', async function () {
            const freshMockModel = createMockModel();
            setupMockModelForValidation(freshMockModel);

            const result = await tokenProvider.validate(testToken);

            assert.deepEqual(result, testData);
            sinon.assert.calledWith(freshMockModel.findOne, {token: testToken}, {transacting: 'test-transaction', forUpdate: true});
            sinon.assert.calledOnce(freshMockModel.save);
        });

        it('should throw ValidationError when token is not found', async function () {
            const notFoundMockModel = buildModel();
            notFoundMockModel.findOne = sinon.stub().resolves(null);

            await assert.rejects(
                tokenProvider.validate(testToken),
                {code: 'INVALID_TOKEN'}
            );

            sinon.assert.calledWith(notFoundMockModel.findOne, {token: testToken}, {transacting: 'test-transaction', forUpdate: true});
        });

        describe('expiration scenarios', function () {
            it('should throw ValidationError when token has reached max usage count', async function () {
                buildModel({usedCount: 7});
                await assert.rejects(
                    tokenProvider.validate(testToken),
                    {code: 'TOKEN_EXPIRED'}
                );
            });

            it('should throw ValidationError when token is expired by lifetime', async function () {
                const oldDate = new Date(Date.now() - (DAY_MS + 1));
                buildModel({createdAt: oldDate});
                await assert.rejects(
                    tokenProvider.validate(testToken),
                    {code: 'TOKEN_EXPIRED'}
                );
            });

            it('should throw ValidationError when token is expired after usage', async function () {
                const oldUsageDate = new Date(Date.now() - (HOUR_MS + 1));
                buildModel({usedCount: 1, firstUsedAt: oldUsageDate});
                await assert.rejects(
                    tokenProvider.validate(testToken),
                    {code: 'TOKEN_EXPIRED'}
                );
            });
        });

        it('should increment usage count for previously used token', async function () {
            const firstUsedDate = new Date(Date.now() - HALF_HOUR_MS);
            const usedMockModel = createMockModel({
                usedCount: 1,
                firstUsedAt: firstUsedDate
            });
            setupMockModelForValidation(usedMockModel);

            const result = await tokenProvider.validate(testToken);

            assert.deepEqual(result, testData);
            sinon.assert.calledWith(usedMockModel.save, sinon.match({
                used_count: 2,
                updated_at: sinon.match.date
            }), sinon.match({autoRefresh: false, patch: true, transacting: 'test-transaction'}));
        });

        it('should set first_used_at on first usage', async function () {
            const firstUsageMockModel = createMockModel();
            setupMockModelForValidation(firstUsageMockModel);

            await tokenProvider.validate(testToken);

            sinon.assert.calledWith(firstUsageMockModel.save, sinon.match({
                first_used_at: sinon.match.date,
                updated_at: sinon.match.date,
                used_count: 1
            }), sinon.match({autoRefresh: false, patch: true, transacting: 'test-transaction'}));
        });

        it('should return empty object when data is invalid JSON', async function () {
            const invalidJsonMockModel = createMockModel({data: 'invalid-json'});
            setupMockModelForValidation(invalidJsonMockModel);

            const result = await tokenProvider.validate(testToken);

            assert.deepEqual(result, {});
        });

        it('should use provided transaction when passed in options', async function () {
            const transactionMockModel = createMockModel();
            transactionMockModel.transaction = sinon.stub();
            tokenProvider.model = transactionMockModel;
            transactionMockModel.findOne = sinon.stub().resolves(transactionMockModel);

            const providedTransaction = {transacting: 'provided-transaction'};
            await tokenProvider.validate(testToken, providedTransaction);

            sinon.assert.calledWith(transactionMockModel.findOne, {token: testToken}, {transacting: 'provided-transaction', forUpdate: true});
            sinon.assert.notCalled(transactionMockModel.transaction);
        });

        describe('OTC verification integration', function () {
            function createOtcVerificationHash(tokenId, token, timestampOverride = null) {
                const otc = tokenProvider.deriveOTC(tokenId, token);
                const timestamp = timestampOverride || Math.floor(Date.now() / 1000);
                const hash = tokenProvider.createOTCVerificationHash(otc, token, timestamp);
                return `${timestamp}:${hash}`;
            }

            it('should validate token with realistic OTC verification hash', async function () {
                const testTokenId = COMMON_TEST_TOKEN.id;
                const otcMockModel = createMockModel({id: testTokenId});
                setupMockModelForValidation(otcMockModel);

                // Need to mock getIdByToken since _validateOTCVerificationHash calls it
                sinon.stub(tokenProvider, 'getIdByToken').resolves(testTokenId);
                const validOtcVerification = createOtcVerificationHash(testTokenId, testToken);

                const result = await tokenProvider.validate(testToken, {otcVerification: validOtcVerification});

                assert.deepEqual(result, testData);
                tokenProvider.getIdByToken.restore();
            });

            it('should throw ValidationError with malformed OTC verification hash', async function () {
                buildModel();
                await assert.rejects(
                    tokenProvider.validate(testToken, {otcVerification: 'malformed-hash'}),
                    {code: 'INVALID_OTC_VERIFICATION_HASH'}
                );
            });

            it('should throw ValidationError with expired OTC verification hash', async function () {
                const testTokenId = COMMON_TEST_TOKEN.id;
                buildModel({id: testTokenId});

                sinon.stub(tokenProvider, 'getIdByToken').resolves(testTokenId);

                const expiredTimestamp = Math.floor(Date.now() / 1000) - (6 * 60); // 6 minutes ago
                const expiredOtcVerification = createOtcVerificationHash(testTokenId, testToken, expiredTimestamp);

                await assert.rejects(
                    tokenProvider.validate(testToken, {otcVerification: expiredOtcVerification}),
                    {code: 'INVALID_OTC_VERIFICATION_HASH'}
                );

                tokenProvider.getIdByToken.restore();
            });

            it('should skip OTC verification when not provided', async function () {
                const noOtcMockModel = createMockModel();
                setupMockModelForValidation(noOtcMockModel);

                const result = await tokenProvider.validate(testToken);

                assert.deepEqual(result, testData);
            });
        });
    });

    describe('createOTCVerificationHash', function () {
        const TOKEN = 'test-token-value';
        const OTC = '123456';
        const TIMESTAMP = 1700000000;

        it('creates deterministic HMAC for same inputs', function () {
            const firstHash = tokenProvider.createOTCVerificationHash(OTC, TOKEN, TIMESTAMP);
            const secondHash = tokenProvider.createOTCVerificationHash(OTC, TOKEN, TIMESTAMP);
            assert.equal(firstHash, secondHash);
            assert.match(firstHash, /^[a-f0-9]{64}$/i);
        });

        it('produces different hashes when OTC differs', function () {
            const firstHash = tokenProvider.createOTCVerificationHash('111111', TOKEN, TIMESTAMP);
            const secondHash = tokenProvider.createOTCVerificationHash('222222', TOKEN, TIMESTAMP);
            assert.notEqual(firstHash, secondHash);
        });

        it('produces different hashes when token differs', function () {
            const firstHash = tokenProvider.createOTCVerificationHash(OTC, 'token-a', TIMESTAMP);
            const secondHash = tokenProvider.createOTCVerificationHash(OTC, 'token-b', TIMESTAMP);
            assert.notEqual(firstHash, secondHash);
        });

        it('produces different hashes when timestamp differs', function () {
            const firstHash = tokenProvider.createOTCVerificationHash(OTC, TOKEN, 1700000000);
            const secondHash = tokenProvider.createOTCVerificationHash(OTC, TOKEN, 1700001000);
            assert.notEqual(firstHash, secondHash);
        });

        it('uses current time as timestamp when not provided', function () {
            sinon.useFakeTimers(new Date('2025-09-02T12:00:00Z'));

            // same current time, hashes match
            const hash1 = tokenProvider.createOTCVerificationHash(OTC, TOKEN);
            const hash2 = tokenProvider.createOTCVerificationHash(OTC, TOKEN);
            assert.equal(hash1, hash2);

            // different current time, hashes don't match
            sinon.clock.tick(2000);

            const hash3 = tokenProvider.createOTCVerificationHash(OTC, TOKEN);
            assert.notEqual(hash3, hash1);
        });

        it('throws when secret is missing', function () {
            const providerNoSecret = new SingleUseTokenProvider({
                SingleUseTokenModel: mockModel,
                validityPeriod: DAY_MS,
                validityPeriodAfterUsage: HOUR_MS,
                maxUsageCount: 3
            });
            assert.throws(() => providerNoSecret.createOTCVerificationHash(OTC, TOKEN), {code: 'OTC_SECRET_NOT_CONFIGURED'});
        });
    });
});
