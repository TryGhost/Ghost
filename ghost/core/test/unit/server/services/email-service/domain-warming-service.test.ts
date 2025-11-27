import {createModelClass} from './utils';
import {DomainWarmingService} from '../../../../../core/server/services/email-service/DomainWarmingService';
import sinon from 'sinon';
import assert from 'assert/strict';

describe('Domain Warming Service', function () {
    let labs: {
        isSet: sinon.SinonStub;
    };
    let config: {
        get: sinon.SinonStub;
    };
    let Email: ReturnType<typeof createModelClass> | {
        findPage: sinon.SinonStub | (() => Promise<any>);
    };

    beforeEach(function () {
        labs = {
            isSet: sinon.stub().returns(false)
        };

        config = {
            get: sinon.stub().returns(undefined)
        };

        Email = createModelClass({
            findAll: []
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('should instantiate with required dependencies', function () {
            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });
            assert.ok(service);
        });
    });

    describe('isEnabled', function () {
        it('should return false when domainWarmup flag is not set', function () {
            labs.isSet.withArgs('domainWarmup').returns(false);
            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = service.isEnabled();
            assert.equal(result, false);
            sinon.assert.calledOnce(labs.isSet);
            sinon.assert.calledWith(labs.isSet, 'domainWarmup');
        });

        it('should return false when domainWarmup flag is set but fallback domain is missing', function () {
            labs.isSet.withArgs('domainWarmup').returns(true);
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns(undefined);
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns('noreply@fallback.com');
            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = service.isEnabled();
            assert.equal(result, false);
        });

        it('should return false when domainWarmup flag is set but fallback address is missing', function () {
            labs.isSet.withArgs('domainWarmup').returns(true);
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example.com');
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns(undefined);
            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = service.isEnabled();
            assert.equal(result, false);
        });

        it('should return true when domainWarmup flag is set and fallback config is present', function () {
            labs.isSet.withArgs('domainWarmup').returns(true);
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example.com');
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns('noreply@fallback.com');
            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = service.isEnabled();
            assert.equal(result, true);
        });
    });

    describe('getWarmupLimit', function () {
        it('should return 200 when no previous emails exist', async function () {
            Email = createModelClass({
                findAll: []
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return 200 when highest count is 0', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 0
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return emailCount when it is less than calculated limit', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 1000
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            // With lastCount=1000, calculated limit is 1250 (1.25× scale)
            // emailCount=1000 is less than 1250, so return emailCount
            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 1000);
        });

        it('should return calculated limit when emailCount is greater', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 1000
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = await service.getWarmupLimit(5000);
            assert.equal(result, 1250);
        });

        it('should handle csd_email_count being null', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: null
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should handle csd_email_count being undefined', async function () {
            Email = createModelClass({
                findAll: [{
                    // csd_email_count is undefined
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should query for emails created before today', async function () {
            const findPageStub = sinon.stub().resolves({data: []});
            Email = {
                findPage: findPageStub
            };

            const today = new Date().toISOString().split('T')[0];

            const service = new DomainWarmingService({
                models: {Email},
                labs,
                config
            });

            await service.getWarmupLimit(1000);

            sinon.assert.calledOnce(findPageStub);
            const callArgs = findPageStub.firstCall.args[0];
            assert.ok(callArgs.filter);
            assert.ok(callArgs.filter.includes(`created_at:<${today}`));
            assert.equal(callArgs.order, 'csd_email_count DESC');
            assert.equal(callArgs.limit, 1);
        });

        it('should return correct warmup progression through the stages', async function () {
            // Test the complete warmup progression
            // New conservative scaling:
            // - Base: 200 for counts ≤100
            // - 1.25× until 1k (conservative early ramp)
            // - 1.5× until 5k (moderate increase)
            // - 1.75× until 100k (faster ramp after proving deliverability)
            // - 2× until 400k
            // - High volume (400k+): min(1.2×, lastCount + 75k) to avoid huge jumps
            const testCases = [
                {lastCount: 0, expected: 200},
                {lastCount: 50, expected: 200},
                {lastCount: 100, expected: 200},
                {lastCount: 200, expected: 250}, // 200 × 1.25 = 250
                {lastCount: 500, expected: 625}, // 500 × 1.25 = 625
                {lastCount: 1000, expected: 1250}, // 1000 × 1.25 = 1250
                {lastCount: 2000, expected: 3000}, // 2000 × 1.5 = 3000
                {lastCount: 5000, expected: 7500}, // 5000 × 1.5 = 7500
                {lastCount: 50000, expected: 87500}, // 50000 × 1.75 = 87500
                {lastCount: 100000, expected: 175000}, // 100000 × 1.75 = 175000
                {lastCount: 200000, expected: 400000}, // 200000 × 2 = 400000
                {lastCount: 400000, expected: 800000}, // 400000 × 2 = 800000
                {lastCount: 500000, expected: 575000}, // min(500000 × 1.2, 500000 + 75000) = min(600000, 575000)
                {lastCount: 800000, expected: 875000} // min(800000 × 1.2, 800000 + 75000) = min(960000, 875000)
            ];

            for (const testCase of testCases) {
                const EmailModel = createModelClass({
                    findAll: [{
                        csd_email_count: testCase.lastCount
                    }]
                });

                const service = new DomainWarmingService({
                    models: {Email: EmailModel},
                    labs,
                    config
                });

                const result = await service.getWarmupLimit(10000000);
                assert.equal(result, testCase.expected, `Expected ${testCase.expected} for lastCount ${testCase.lastCount}, but got ${result}`);
            }
        });
    });
});
