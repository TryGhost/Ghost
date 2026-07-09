import assert from 'node:assert/strict';
import sinon from 'sinon';
import {NewsletterEmailAnalyticsProcessor} from '../../../../../core/server/services/email-analytics/newsletter-email-analytics-processor';

const configUtils = require('../../../../utils/config-utils');

const {EventProcessingResult} = require('../../../../../core/server/services/email-analytics/event-processing-result');

type AnalyticsQueriesSpies = {
    aggregateEmailStats: sinon.SinonSpy;
    aggregateMemberStats: sinon.SinonSpy;
    aggregateMemberStatsBatch: sinon.SinonSpy;
};

function createMockConfig() {
    return {
        get: (key: string) => configUtils.config.get(key)
    };
}

describe('NewsletterEmailAnalyticsProcessor', function () {
    describe('processEventBatch', function () {
        // Run all processEventBatch tests with both batching modes
        [true, false].forEach((batchProcessing) => {
            const modeLabel = batchProcessing ? 'batching enabled' : 'batching disabled';

            describe(`with ${modeLabel}`, function () {
                beforeEach(function () {
                    configUtils.set('emailAnalytics:batchProcessing', batchProcessing);
                });

                afterEach(function () {
                    configUtils.restore();
                });

                describe('with functional processor', function () {
                    let eventProcessor: Record<string, sinon.SinonStub>;
                    beforeEach(function () {
                        eventProcessor = {};
                        eventProcessor.batchGetRecipients = sinon.stub().resolves(new Map());
                        eventProcessor.flushBatchedUpdates = sinon.stub().resolves();
                        eventProcessor.handleDelivered = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleOpened = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handlePermanentFailed = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleTemporaryFailed = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleUnsubscribed = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleComplained = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                    });

                    it('uses passed-in event processor', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};
                        const processEventBatch = service.processEventBatch;
                        await processEventBatch([{
                            type: 'delivered',
                            emailId: 1,
                            timestamp: new Date(1)
                        }, {
                            type: 'delivered',
                            emailId: 2,
                            timestamp: new Date(2)
                        }, {
                            type: 'opened',
                            emailId: 1,
                            timestamp: new Date(3)
                        }], result, fetchData);

                        sinon.assert.calledTwice(eventProcessor.handleDelivered);
                        sinon.assert.calledOnce(eventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            delivered: 2,
                            opened: 1,
                            unprocessable: 0,
                            emailIds: [1, 2],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(3)
                        });
                    });

                    it('handles opened', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'opened',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            delivered: 0,
                            opened: 1,
                            unprocessable: 0,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it('handles delivered', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'delivered',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handleDelivered);

                        assert.deepEqual(result, new EventProcessingResult({
                            delivered: 1,
                            opened: 0,
                            unprocessable: 0,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it('handles failed (permanent)', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'failed',
                            severity: 'permanent',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handlePermanentFailed);

                        assert.deepEqual(result, new EventProcessingResult({
                            permanentFailed: 1,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it('handles failed (temporary)', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'failed',
                            severity: 'temporary',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handleTemporaryFailed);

                        assert.deepEqual(result, new EventProcessingResult({
                            temporaryFailed: 1,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it('handles unsubscribed', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'unsubscribed',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handleUnsubscribed);
                        sinon.assert.notCalled(eventProcessor.handleDelivered);
                        sinon.assert.notCalled(eventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            unsubscribed: 1,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it('handles complained', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'complained',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(eventProcessor.handleComplained);
                        sinon.assert.notCalled(eventProcessor.handleDelivered);
                        sinon.assert.notCalled(eventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            complained: 1,
                            emailIds: [1],
                            memberIds: [1]
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });

                    it(`doens't handle other event types`, async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'notstandard',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.notCalled(eventProcessor.handleDelivered);
                        sinon.assert.notCalled(eventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            unhandled: 1
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });
                });

                describe('with null processor results', function () {
                    let eventProcessor: Record<string, sinon.SinonStub>;
                    beforeEach(function () {
                        eventProcessor = {};
                        eventProcessor.batchGetRecipients = sinon.stub().resolves(new Map());
                        eventProcessor.flushBatchedUpdates = sinon.stub().resolves();
                        eventProcessor.handleDelivered = sinon.stub().returns(null);
                        eventProcessor.handleOpened = sinon.stub().returns(null);
                        eventProcessor.handlePermanentFailed = sinon.stub().returns(null);
                        eventProcessor.handleTemporaryFailed = sinon.stub().returns(null);
                        eventProcessor.handleUnsubscribed = sinon.stub().returns(null);
                        eventProcessor.handleComplained = sinon.stub().returns(null);
                    });

                    it('delivered returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'delivered',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('opened returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'opened',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('failed (permanent) returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'failed',
                            emailId: 1,
                            timestamp: new Date(1),
                            severity: 'permanent'
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('failed (temporary) returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'failed',
                            emailId: 1,
                            timestamp: new Date(1),
                            severity: 'temporary'
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('unsubscribed returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'unsubscribed',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('complained returns unprocessable', async function () {
                        const service = new NewsletterEmailAnalyticsProcessor({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await service.processEventBatch([{
                            type: 'complained',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });
                });

                it(`verifies batch methods called correctly in ${modeLabel} mode`, async function () {
                    const eventProcessor = {
                        batchGetRecipients: sinon.stub().resolves(new Map()),
                        flushBatchedUpdates: sinon.stub().resolves(),
                        handleDelivered: sinon.stub().resolves({emailId: 1, emailRecipientId: 1, memberId: 1})
                    };

                    const service = new NewsletterEmailAnalyticsProcessor({
                        config: createMockConfig(),
                        eventProcessor
                    });
                    const result = new EventProcessingResult();
                    const fetchData = {};

                    await service.processEventBatch([{
                        type: 'delivered',
                        emailId: 1,
                        timestamp: new Date(1)
                    }], result, fetchData);

                    if (batchProcessing) {
                        // In batched mode, should call batchGetRecipients and flushBatchedUpdates
                        sinon.assert.calledOnce(eventProcessor.batchGetRecipients);
                        sinon.assert.calledOnce(eventProcessor.flushBatchedUpdates);
                    } else {
                        // In sequential mode, should not call batch methods
                        sinon.assert.notCalled(eventProcessor.batchGetRecipients);
                        sinon.assert.notCalled(eventProcessor.flushBatchedUpdates);
                    }
                });
            });
        });
    });

    describe('aggregateStats', function () {
        describe('with batching enabled', function () {
            let service: NewsletterEmailAnalyticsProcessor;
            let queries: AnalyticsQueriesSpies;

            beforeEach(function () {
                configUtils.set('emailAnalytics:batchProcessing', true);
                queries = {
                    aggregateEmailStats: sinon.spy(),
                    aggregateMemberStats: sinon.spy(),
                    aggregateMemberStatsBatch: sinon.spy()
                };
                service = new NewsletterEmailAnalyticsProcessor({
                    config: createMockConfig(),
                    queries
                });
            });

            afterEach(function () {
                configUtils.restore();
            });

            it('calls batched query for member stats', async function () {
                const aggregateStats = service.aggregateStats;
                await aggregateStats({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                sinon.assert.calledTwice(queries.aggregateEmailStats);
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-1');
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-2');

                // In batched mode, aggregateMemberStatsBatch should be called
                sinon.assert.calledOnce(queries.aggregateMemberStatsBatch);
                sinon.assert.calledWith(queries.aggregateMemberStatsBatch, ['m-1', 'm-2']);

                // Sequential method should not be called
                sinon.assert.notCalled(queries.aggregateMemberStats);
            });
        });

        describe('with batching disabled', function () {
            let service: NewsletterEmailAnalyticsProcessor;
            let queries: AnalyticsQueriesSpies;

            beforeEach(function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                queries = {
                    aggregateEmailStats: sinon.spy(),
                    aggregateMemberStats: sinon.spy(),
                    aggregateMemberStatsBatch: sinon.spy()
                };
                service = new NewsletterEmailAnalyticsProcessor({
                    config: createMockConfig(),
                    queries
                });
            });

            afterEach(function () {
                configUtils.restore();
            });

            it('calls sequential query for member stats', async function () {
                await service.aggregateStats({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                sinon.assert.calledTwice(queries.aggregateEmailStats);
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-1');
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-2');

                // In sequential mode, aggregateMemberStats should be called for each member
                sinon.assert.calledTwice(queries.aggregateMemberStats);
                sinon.assert.calledWith(queries.aggregateMemberStats, 'm-1');
                sinon.assert.calledWith(queries.aggregateMemberStats, 'm-2');

                // Batch method should not be called
                sinon.assert.notCalled(queries.aggregateMemberStatsBatch);
            });
        });
    });

    describe('flush', function () {
        let queries: AnalyticsQueriesSpies;
        let eventProcessor: Record<string, sinon.SinonStub>;

        function createProcessor() {
            return new NewsletterEmailAnalyticsProcessor({
                config: createMockConfig(),
                eventProcessor,
                queries
            });
        }

        async function processOne(processor: NewsletterEmailAnalyticsProcessor, emailId: number) {
            await processor.processEventBatch(
                [{type: 'delivered', emailId, timestamp: new Date(emailId)}],
                new EventProcessingResult(),
                {}
            );
        }

        beforeEach(function () {
            // Sequential mode keeps the member-stat assertions simple (one call per member)
            configUtils.set('emailAnalytics:batchProcessing', false);
            queries = {
                aggregateEmailStats: sinon.spy(),
                aggregateMemberStats: sinon.spy(),
                aggregateMemberStatsBatch: sinon.spy()
            };
            eventProcessor = {};
            eventProcessor.handleDelivered = sinon.stub().callsFake(({emailId}: {emailId: string | number}) => ({
                emailId,
                emailRecipientId: emailId,
                memberId: `m-${emailId}`
            }));
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('aggregates the ids collected since the last flush when forced', async function () {
            const processor = createProcessor();
            await processOne(processor, 1);
            await processOne(processor, 2);

            const timings = await processor.flush({force: true});

            sinon.assert.calledWith(queries.aggregateEmailStats, 1);
            sinon.assert.calledWith(queries.aggregateEmailStats, 2);
            sinon.assert.calledWith(queries.aggregateMemberStats, 'm-1');
            sinon.assert.calledWith(queries.aggregateMemberStats, 'm-2');
            assert.equal(typeof timings.emailAggregationTimeMs, 'number');
            assert.equal(typeof timings.memberAggregationTimeMs, 'number');
        });

        it('does nothing when not forced and the flush interval has not elapsed', async function () {
            const processor = createProcessor();
            await processOne(processor, 1);

            const timings = await processor.flush({force: false});

            sinon.assert.notCalled(queries.aggregateEmailStats);
            sinon.assert.notCalled(queries.aggregateMemberStats);
            assert.deepEqual(timings, {emailAggregationTimeMs: 0, memberAggregationTimeMs: 0});
        });

        it('clears pending ids so a subsequent flush does not re-aggregate them', async function () {
            const processor = createProcessor();
            await processOne(processor, 1);

            await processor.flush({force: true});
            queries.aggregateEmailStats.resetHistory();
            queries.aggregateMemberStats.resetHistory();

            const timings = await processor.flush({force: true});

            sinon.assert.notCalled(queries.aggregateEmailStats);
            sinon.assert.notCalled(queries.aggregateMemberStats);
            assert.deepEqual(timings, {emailAggregationTimeMs: 0, memberAggregationTimeMs: 0});
        });
    });

    describe('aggregateEmailStats', function () {
        it('returns the query result', async function () {
            const aggregateEmailStats = sinon.stub().resolves();
            const service = new NewsletterEmailAnalyticsProcessor({
                config: createMockConfig(),
                queries: {
                    aggregateEmailStats
                }
            });

            await service.aggregateEmailStats('memberId');

            sinon.assert.calledOnce(aggregateEmailStats);
            sinon.assert.calledWith(aggregateEmailStats, 'memberId');
        });
    });

    describe('aggregateMemberStats', function () {
        it('returns the query result', async function () {
            const aggregateMemberStats = sinon.stub().resolves();
            const service = new NewsletterEmailAnalyticsProcessor({
                config: createMockConfig(),
                queries: {
                    aggregateMemberStats
                }
            });

            await service.aggregateMemberStats('memberId');

            sinon.assert.calledOnce(aggregateMemberStats);
            sinon.assert.calledWith(aggregateMemberStats, 'memberId');
        });
    });
});
