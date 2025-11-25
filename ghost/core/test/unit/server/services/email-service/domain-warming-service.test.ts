import {createModelClass} from './utils';
import {DomainWarmingService} from '../../../../../core/server/services/email-service/DomainWarmingService';
import sinon from 'sinon';
import assert from 'assert/strict';

describe('Domain Warming Service', function () {
    let labs: {
        isSet: sinon.SinonStub;
    };
    let Email: ReturnType<typeof createModelClass> | {
        findOne: sinon.SinonStub | (() => Promise<any>);
    };

    beforeEach(function () {
        labs = {
            isSet: sinon.stub().returns(false)
        };

        Email = createModelClass({
            findOne: null
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('constructor', function () {
        it('should instantiate with required dependencies', function () {
            const service = new DomainWarmingService({
                models: {Email},
                labs
            });
            assert.ok(service);
        });
    });

    describe('isEnabled', function () {
        it('should return false when domainWarmup flag is not set', function () {
            labs.isSet.withArgs('domainWarmup').returns(false);
            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = service.isEnabled();
            assert.equal(result, false);
            sinon.assert.calledOnce(labs.isSet);
            sinon.assert.calledWith(labs.isSet, 'domainWarmup');
        });

        it('should return true when domainWarmup flag is set', function () {
            labs.isSet.withArgs('domainWarmup').returns(true);
            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = service.isEnabled();
            assert.equal(result, true);
            sinon.assert.calledOnce(labs.isSet);
            sinon.assert.calledWith(labs.isSet, 'domainWarmup');
        });
    });

    describe('getWarmupLimit', function () {
        it('should return 200 when no previous emails exist', async function () {
            Email = {
                findOne: async () => null
            };

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return 200 when highest count is 0', async function () {
            Email = createModelClass({
                findOne: {
                    csd_email_count: 0
                }
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should return emailCount when it is less than calculated limit', async function () {
            Email = createModelClass({
                findOne: {
                    csd_email_count: 1000
                }
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(1500);
            assert.equal(result, 1500);
        });

        it('should return calculated limit when emailCount is greater', async function () {
            Email = createModelClass({
                findOne: {
                    csd_email_count: 1000
                }
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(5000);
            assert.equal(result, 2000);
        });

        it('should handle csd_email_count being null', async function () {
            Email = createModelClass({
                findOne: {
                    csd_email_count: null
                }
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should handle csd_email_count being undefined', async function () {
            Email = createModelClass({
                findOne: {
                    // csd_email_count is undefined
                }
            });

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            const result = await service.getWarmupLimit(1000);
            assert.equal(result, 200);
        });

        it('should query for emails created before today', async function () {
            const findOneStub = sinon.stub().resolves(null);
            Email = {
                findOne: findOneStub
            };

            const today = new Date().toISOString().split('T')[0];

            const service = new DomainWarmingService({
                models: {Email},
                labs
            });

            await service.getWarmupLimit(1000);

            sinon.assert.calledOnce(findOneStub);
            const callArgs = findOneStub.firstCall.args[0];
            assert.ok(callArgs.filter);
            assert.ok(callArgs.filter.includes(`created_at:<${today}`));
            assert.equal(callArgs.order, 'csd_email_count DESC');
        });

        it('should return correct warmup progression through the stages', async function () {
            // Test the complete warmup progression
            const testCases = [
                {lastCount: 0, expected: 200},
                {lastCount: 50, expected: 200},
                {lastCount: 100, expected: 200},
                {lastCount: 200, expected: 400},
                {lastCount: 500, expected: 1000},
                {lastCount: 1000, expected: 2000},
                {lastCount: 50000, expected: 100000},
                {lastCount: 100000, expected: 200000},
                {lastCount: 200000, expected: 300000},
                {lastCount: 400000, expected: 600000},
                {lastCount: 500000, expected: 625000},
                {lastCount: 800000, expected: 1000000}
            ];

            for (const testCase of testCases) {
                const EmailModel = createModelClass({
                    findOne: {
                        csd_email_count: testCase.lastCount
                    }
                });

                const service = new DomainWarmingService({
                    models: {Email: EmailModel},
                    labs
                });

                const result = await service.getWarmupLimit(10000000);
                assert.equal(result, testCase.expected, `Expected ${testCase.expected} for lastCount ${testCase.lastCount}, but got ${result}`);
            }
        });
    });
});
