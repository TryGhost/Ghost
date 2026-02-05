import {createModelClass} from './utils';
import {DomainWarmingService} from '../../../../../core/server/services/email-service/domain-warming-service';
import sinon from 'sinon';
import assert from 'assert/strict';

describe('Domain Warming Service', function () {
    let config: {
        get: sinon.SinonStub;
    };
    let Email: ReturnType<typeof createModelClass> | {
        findPage: sinon.SinonStub | (() => Promise<any>);
    };
    let clock: sinon.SinonFakeTimers;

    beforeEach(function () {
        config = {
            get: sinon.stub().returns(undefined)
        };

        Email = createModelClass({
            findAll: []
        });

        // Fix the current time for consistent test results
        clock = sinon.useFakeTimers(new Date('2024-01-15T12:00:00Z').getTime());
    });

    afterEach(function () {
        clock.restore();
        sinon.restore();
    });

    describe('constructor', function () {
        it('should instantiate with required dependencies', function () {
            const service = new DomainWarmingService({
                models: {Email},
                config
            });
            assert.ok(service);
        });
    });

    describe('isEnabled', function () {
        it('should return false when fallback domain is missing', function () {
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns(undefined);
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns('noreply@fallback.com');
            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = service.isEnabled();
            assert.equal(result, false);
        });

        it('should return false when fallback address is missing', function () {
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example.com');
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns(undefined);
            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = service.isEnabled();
            assert.equal(result, false);
        });

        it('should return true when fallback config is present', function () {
            config.get.withArgs('hostSettings:managedEmail:fallbackDomain').returns('fallback.example.com');
            config.get.withArgs('hostSettings:managedEmail:fallbackAddress').returns('noreply@fallback.com');
            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = service.isEnabled();
            assert.equal(result, true);
        });
    });

    describe('getWarmupLimit', function () {
        // Helper to create a date N days ago
        function daysAgo(days: number): string {
            const date = new Date('2024-01-15T12:00:00Z');
            date.setDate(date.getDate() - days);
            return date.toISOString();
        }

        it('should return 200 (start value) when no previous emails exist (day 0)', async function () {
            Email = createModelClass({
                findAll: []
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return 200 (start value) when first email was today (day 0)', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 100,
                    created_at: daysAgo(0)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return emailCount when it is less than calculated limit', async function () {
            // After 21 days (halfway through 42-day warmup), limit should be much higher than 1000
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 100,
                    created_at: daysAgo(21)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            // emailCount=1000 should be less than the calculated limit at day 21
            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 1000);
        });

        it('should return calculated limit when emailCount is greater', async function () {
            // Day 1 of warmup: limit should be 237 (200 * (200000/200)^(1/41))
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 100,
                    created_at: daysAgo(1)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(5000);
            // Day 1: 200 * (1000)^(1/41) ≈ 237
            assert.equal(result, 237);
        });

        it('should handle csd_email_count being null', async function () {
            Email = createModelClass({
                findAll: [{
                    csd_email_count: null,
                    created_at: daysAgo(0)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should handle csd_email_count being undefined', async function () {
            Email = createModelClass({
                findAll: [{
                    // csd_email_count is undefined
                    created_at: daysAgo(0)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should query for first email with csd_email_count', async function () {
            const findPageStub = sinon.stub().resolves({data: []});
            Email = {
                findPage: findPageStub
            };

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            await service.getWarmupLimit(1000);

            sinon.assert.calledOnce(findPageStub);
            const callArgs = findPageStub.firstCall.args[0];
            assert.ok(callArgs.filter);
            assert.ok(callArgs.filter.includes('csd_email_count:-null'));
            assert.equal(callArgs.order, 'created_at ASC');
            assert.equal(callArgs.limit, 1);
        });

        it('should return correct warmup progression through the days', async function () {
            // Test the time-based warmup progression
            // Formula: start * (end/start)^(day/(totalDays-1))
            // With start=200, end=200000, totalDays=42
            // This creates exponential growth from 200 to 200000 over 42 days
            const testCases = [
                {day: 0, expected: 200}, // Day 0: start value
                {day: 1, expected: 237}, // Day 1
                {day: 5, expected: 464}, // Day 5
                {day: 10, expected: 1078}, // Day 10
                {day: 20, expected: 5814}, // Day 20
                {day: 21, expected: 6880}, // Day 21 (halfway)
                {day: 30, expected: 31344}, // Day 30
                {day: 40, expected: 168989}, // Day 40
                {day: 41, expected: 200000} // Day 41: end value
            ];

            for (const testCase of testCases) {
                const EmailModel = createModelClass({
                    findAll: [{
                        csd_email_count: 100,
                        created_at: daysAgo(testCase.day)
                    }]
                });

                const service = new DomainWarmingService({
                    models: {Email: EmailModel},
                    config
                });

                const result = await service.getWarmupLimit(10000000);
                assert.equal(result, testCase.expected, `Expected ${testCase.expected} for day ${testCase.day}, but got ${result}`);
            }
        });

        it('should return Infinity after warmup period is complete', async function () {
            // After 42 days, warmup is complete
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 100,
                    created_at: daysAgo(42)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000000);
            assert.equal(result, Infinity);
        });

        it('should return Infinity well after warmup period is complete', async function () {
            // After 100 days, warmup should definitely be complete
            Email = createModelClass({
                findAll: [{
                    csd_email_count: 100,
                    created_at: daysAgo(100)
                }]
            });

            const service = new DomainWarmingService({
                models: {Email},
                config
            });

            const result = await service.getWarmupLimit(1000000);
            assert.equal(result, Infinity);
        });
    });
});
