const assert = require('node:assert/strict');

const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');

const {NewsletterEmailAnalyticsBatchProcessor} = require('../../../../../core/server/services/email-analytics/newsletter-email-analytics-batch-processor');
const {EventProcessingResult} = require('../../../../../core/server/services/email-analytics/event-processing-result');

/**
 * Create a mock config object that reads from configUtils
 * This allows tests to use configUtils.set() while production code uses this.config.get()
 */
function createMockConfig() {
    return {
        get: key => configUtils.config.get(key)
    };
}

describe('NewsletterEmailAnalyticsBatchProcessor', function () {
    let clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers(new Date(2024, 0, 1));
    });

    afterEach(function () {
        clock.restore();
        sinon.restore();
    });

    describe('processBatch', function () {
        // Run all processBatch tests with both batching modes
        [true, false].forEach((batchProcessing) => {
            const modeLabel = batchProcessing ? 'batching enabled' : 'batching disabled';

            describe(`with ${modeLabel}`, function () {
                beforeEach(function () {
                    configUtils.set('emailAnalytics:batchProcessing', batchProcessing);
                });

                afterEach(function () {
                    configUtils.restore();
                });

                describe('with functional event processor', function () {
                    let emailEventProcessor;
                    beforeEach(function () {
                        emailEventProcessor = {};
                        emailEventProcessor.batchGetRecipients = sinon.stub().resolves(new Map());
                        emailEventProcessor.flushBatchedUpdates = sinon.stub().resolves();
                        emailEventProcessor.handleDelivered = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        emailEventProcessor.handleOpened = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        emailEventProcessor.handlePermanentFailed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        emailEventProcessor.handleTemporaryFailed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        emailEventProcessor.handleUnsubscribed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        emailEventProcessor.handleComplained = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                    });

                    it('uses passed-in event processor', async function () {
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};
                        await processor.processBatch([{
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

                        sinon.assert.calledTwice(emailEventProcessor.handleDelivered);
                        sinon.assert.calledOnce(emailEventProcessor.handleOpened);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'opened',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handleOpened);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'delivered',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handleDelivered);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'failed',
                            severity: 'permanent',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handlePermanentFailed);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'failed',
                            severity: 'temporary',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handleTemporaryFailed);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'unsubscribed',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handleUnsubscribed);
                        sinon.assert.notCalled(emailEventProcessor.handleDelivered);
                        sinon.assert.notCalled(emailEventProcessor.handleOpened);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'complained',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.calledOnce(emailEventProcessor.handleComplained);
                        sinon.assert.notCalled(emailEventProcessor.handleDelivered);
                        sinon.assert.notCalled(emailEventProcessor.handleOpened);

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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'notstandard',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        sinon.assert.notCalled(emailEventProcessor.handleDelivered);
                        sinon.assert.notCalled(emailEventProcessor.handleOpened);

                        assert.deepEqual(result, new EventProcessingResult({
                            unhandled: 1
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });
                });

                describe('with null event processor results', function () {
                    let emailEventProcessor;
                    beforeEach(function () {
                        emailEventProcessor = {};
                        emailEventProcessor.batchGetRecipients = sinon.stub().resolves(new Map());
                        emailEventProcessor.flushBatchedUpdates = sinon.stub().resolves();
                        emailEventProcessor.handleDelivered = sinon.stub().returns(null);
                        emailEventProcessor.handleOpened = sinon.stub().returns(null);
                        emailEventProcessor.handlePermanentFailed = sinon.stub().returns(null);
                        emailEventProcessor.handleTemporaryFailed = sinon.stub().returns(null);
                        emailEventProcessor.handleUnsubscribed = sinon.stub().returns(null);
                        emailEventProcessor.handleComplained = sinon.stub().returns(null);
                    });

                    it('delivered returns unprocessable', async function () {
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'delivered',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('opened returns unprocessable', async function () {
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'opened',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('failed (permanent) returns unprocessable', async function () {
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
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
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
                            type: 'unsubscribed',
                            emailId: 1,
                            timestamp: new Date(1)
                        }], result, fetchData);

                        assert.deepEqual(result, new EventProcessingResult({
                            unprocessable: 1
                        }));
                    });

                    it('complained returns unprocessable', async function () {
                        const processor = new NewsletterEmailAnalyticsBatchProcessor({
                            config: createMockConfig(),
                            emailEventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};

                        await processor.processBatch([{
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
                    const emailEventProcessor = {
                        batchGetRecipients: sinon.stub().resolves(new Map()),
                        flushBatchedUpdates: sinon.stub().resolves(),
                        handleDelivered: sinon.stub().resolves({emailId: 1, emailRecipientId: 1, memberId: 1})
                    };

                    const processor = new NewsletterEmailAnalyticsBatchProcessor({
                        config: createMockConfig(),
                        emailEventProcessor
                    });
                    const result = new EventProcessingResult();
                    const fetchData = {};

                    await processor.processBatch([{
                        type: 'delivered',
                        emailId: 1,
                        timestamp: new Date(1)
                    }], result, fetchData);

                    if (batchProcessing) {
                        // In batched mode, should call batchGetRecipients and flushBatchedUpdates
                        sinon.assert.calledOnce(emailEventProcessor.batchGetRecipients);
                        sinon.assert.calledOnce(emailEventProcessor.flushBatchedUpdates);
                    } else {
                        // In sequential mode, should not call batch methods
                        sinon.assert.notCalled(emailEventProcessor.batchGetRecipients);
                        sinon.assert.notCalled(emailEventProcessor.flushBatchedUpdates);
                    }
                });
            });
        });
    });

    describe('aggregate', function () {
        let queries;

        beforeEach(function () {
            queries = {
                aggregateEmailStats: sinon.stub().resolves(),
                aggregateMemberStats: sinon.stub().resolves(),
                aggregateMemberStatsBatch: sinon.stub().resolves()
            };
        });

        afterEach(function () {
            configUtils.restore();
        });

        function createProcessor() {
            return new NewsletterEmailAnalyticsBatchProcessor({
                config: createMockConfig(),
                queries
            });
        }

        describe('final aggregation', function () {
            it('aggregates stats from the processing result', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                sinon.assert.calledTwice(queries.aggregateEmailStats);
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-1', true);
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-2', true);

                sinon.assert.calledTwice(queries.aggregateMemberStats);
                sinon.assert.calledWith(queries.aggregateMemberStats, 'm-1');
                sinon.assert.calledWith(queries.aggregateMemberStats, 'm-2');

                assert.deepEqual(timings, {
                    emailAggregationTimeMs: 0,
                    memberAggregationTimeMs: 0
                });
            });

            it('resets the processing result after aggregating', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    delivered: 3,
                    emailIds: ['e-1'],
                    memberIds: ['m-1']
                });

                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                assert.deepEqual(processingResult, new EventProcessingResult());
            });

            it('passes includeOpenedEvents through to email stats aggregation', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1']
                });

                await processor.aggregate({
                    includeOpenedEvents: false,
                    processingResult,
                    isFinal: true
                });

                sinon.assert.calledOnceWithExactly(queries.aggregateEmailStats, 'e-1', false);
            });

            it('skips when there is nothing to aggregate', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult: new EventProcessingResult(),
                    isFinal: true
                });

                assert.equal(timings, null);
                sinon.assert.notCalled(queries.aggregateEmailStats);
                sinon.assert.notCalled(queries.aggregateMemberStats);
                sinon.assert.notCalled(queries.aggregateMemberStatsBatch);
            });

            it('aggregates the ids collected by processBatch', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = new NewsletterEmailAnalyticsBatchProcessor({
                    config: createMockConfig(),
                    emailEventProcessor: {
                        handleDelivered: sinon.stub().resolves({emailId: 'e-1', emailRecipientId: 'r-1', memberId: 'm-1'})
                    },
                    queries
                });
                const processingResult = new EventProcessingResult();

                await processor.processBatch([{
                    type: 'delivered',
                    emailId: 'e-1',
                    timestamp: new Date(1)
                }], processingResult, {});

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                assert.notEqual(timings, null);
                sinon.assert.calledOnceWithExactly(queries.aggregateEmailStats, 'e-1', true);
                sinon.assert.calledOnceWithExactly(queries.aggregateMemberStats, 'm-1');
            });

            it('keeps the processing result when aggregation fails, so a later aggregation can retry it', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1'],
                    memberIds: ['m-1']
                });

                queries.aggregateEmailStats.rejects(new Error('aggregation failed'));
                clock.tick(5 * 60 * 1000 + 1);
                await assert.rejects(processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: false
                }), /aggregation failed/);

                // The ids must survive the failure so the final aggregation picks them up
                assert.deepEqual(processingResult.emailIds, ['e-1']);
                assert.deepEqual(processingResult.memberIds, ['m-1']);

                queries.aggregateEmailStats.resolves();
                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                assert.notEqual(timings, null);
                sinon.assert.calledWith(queries.aggregateEmailStats, 'e-1', true);
                sinon.assert.calledWith(queries.aggregateMemberStats, 'm-1');
            });

            it('skips when an intermediate aggregation already drained the result', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1'],
                    memberIds: ['m-1']
                });

                // An intermediate aggregation consumes and resets the processing result
                clock.tick(5 * 60 * 1000 + 1);
                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: false
                });
                sinon.assert.calledOnce(queries.aggregateEmailStats);
                queries.aggregateEmailStats.resetHistory();
                queries.aggregateMemberStats.resetHistory();

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                assert.equal(timings, null);
                sinon.assert.notCalled(queries.aggregateEmailStats);
                sinon.assert.notCalled(queries.aggregateMemberStats);
            });
        });

        describe('intermediate aggregation', function () {
            it('skips when the last aggregation was recent and the batch is small', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1'],
                    memberIds: ['m-1']
                });

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: false
                });

                assert.equal(timings, null);
                sinon.assert.notCalled(queries.aggregateEmailStats);
                sinon.assert.notCalled(queries.aggregateMemberStats);
                // Skipping should leave the processing result untouched
                assert.deepEqual(processingResult.emailIds, ['e-1']);
                assert.deepEqual(processingResult.memberIds, ['m-1']);
            });

            it('aggregates after 5 minutes have passed', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1'],
                    memberIds: ['m-1']
                });

                clock.tick(5 * 60 * 1000 + 1);

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: false
                });

                assert.notEqual(timings, null);
                sinon.assert.calledOnceWithExactly(queries.aggregateEmailStats, 'e-1', true);
                sinon.assert.calledOnceWithExactly(queries.aggregateMemberStats, 'm-1');
                assert.deepEqual(processingResult, new EventProcessingResult());
            });

            it('aggregates when the batch has more than 5000 member ids', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const memberIds = Array.from({length: 5001}, (_, i) => `m-${i}`);
                const processingResult = new EventProcessingResult({memberIds});

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: false
                });

                assert.notEqual(timings, null);
                assert.equal(queries.aggregateMemberStats.callCount, 5001);
            });

            it('does not aggregate again immediately after aggregating', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();

                clock.tick(5 * 60 * 1000 + 1);
                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult: new EventProcessingResult({emailIds: ['e-1']}),
                    isFinal: false
                });
                sinon.assert.calledOnce(queries.aggregateEmailStats);

                const timings = await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult: new EventProcessingResult({emailIds: ['e-2']}),
                    isFinal: false
                });

                assert.equal(timings, null);
                sinon.assert.calledOnce(queries.aggregateEmailStats);
            });
        });

        describe('member stats batching', function () {
            it('calls batched query for member stats when batching is enabled', async function () {
                configUtils.set('emailAnalytics:batchProcessing', true);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
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

            it('chunks member ids into batches of 100', async function () {
                configUtils.set('emailAnalytics:batchProcessing', true);
                const processor = createProcessor();
                const memberIds = Array.from({length: 250}, (_, i) => `m-${i}`);
                const processingResult = new EventProcessingResult({memberIds});

                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
                });

                assert.equal(queries.aggregateMemberStatsBatch.callCount, 3);
                assert.equal(queries.aggregateMemberStatsBatch.getCall(0).args[0].length, 100);
                assert.equal(queries.aggregateMemberStatsBatch.getCall(1).args[0].length, 100);
                assert.equal(queries.aggregateMemberStatsBatch.getCall(2).args[0].length, 50);
            });

            it('calls sequential query for member stats when batching is disabled', async function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                const processor = createProcessor();
                const processingResult = new EventProcessingResult({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                await processor.aggregate({
                    includeOpenedEvents: true,
                    processingResult,
                    isFinal: true
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
});
