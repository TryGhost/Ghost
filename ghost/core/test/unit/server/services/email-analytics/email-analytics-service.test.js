const assert = require('node:assert/strict');
require('should');

const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');

const EmailAnalyticsService = require('../../../../../core/server/services/email-analytics/email-analytics-service');
const EventProcessingResult = require('../../../../../core/server/services/email-analytics/event-processing-result');

/**
 * Create a mock config object that reads from configUtils
 * This allows tests to use configUtils.set() while production code uses this.config.get()
 */
function createMockConfig() {
    return {
        get: key => configUtils.config.get(key)
    };
}

describe('EmailAnalyticsService', function () {
    let clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers(new Date(2024, 0, 1));
    });

    afterEach(function () {
        clock.restore();
    });

    describe('getStatus', function () {
        it('returns status object', function () {
            // these are null because we're not running them before calling this
            const service = new EmailAnalyticsService({});
            const result = service.getStatus();
            assert.deepEqual(result, {
                latest: {
                    jobName: 'email-analytics-latest-others',
                    running: false
                },
                latestOpened: {
                    jobName: 'email-analytics-latest-opened',
                    running: false
                },
                missing: {
                    jobName: 'email-analytics-missing',
                    running: false
                },
                scheduled: {
                    jobName: 'email-analytics-scheduled',
                    running: false
                }
            });
        });
    });

    describe('getLastNonOpenedEventTimestamp', function () {
        it('returns the queried timestamp before the fallback', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(new Date(1))
                }
            });

            const result = await service.getLastNonOpenedEventTimestamp();
            assert.deepEqual(result, new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(null)
                }
            });

            const result = await service.getLastNonOpenedEventTimestamp();
            assert.deepEqual(result, new Date(Date.now() - 30 * 60 * 1000)); // should be 30 mins prior
        });
    });

    describe('getLastSeenOpenedEventTimestamp', function () {
        it('returns the queried timestamp before the fallback', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(new Date(1))
                }
            });

            const result = await service.getLastOpenedEventTimestamp();
            assert.deepEqual(result, new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(null)
                }
            });

            const result = await service.getLastOpenedEventTimestamp();
            assert.deepEqual(result, new Date(Date.now() - 30 * 60 * 1000)); // should be 30 mins prior
        });
    });

    describe('Fetching events', function () {
        afterEach(function () {
            sinon.restore();
        });
        describe('fetchLatestOpenedEvents', function () {
            it('fetches only opened events', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(),
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });
                await service.fetchLatestOpenedEvents();
                assert.equal(fetchLatestSpy.calledOnce, true);
                assert.deepEqual(fetchLatestSpy.getCall(0).args[1].events, ['opened']);
            });

            it('quits if the end is before the begin', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours in the future
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });
                await service.fetchLatestOpenedEvents();
                assert.equal(fetchLatestSpy.calledOnce, false);
            });
        });

        describe('fetchLatestNonOpenedEvents', function () {
            it('fetches only non-opened events', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(),
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });
                await service.fetchLatestNonOpenedEvents();
                assert.equal(fetchLatestSpy.calledOnce, true);
                assert.deepEqual(fetchLatestSpy.getCall(0).args[1].events, ['delivered', 'failed', 'unsubscribed', 'complained']);
            });

            it('quits if the end is before the begin', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours in the future
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });
                await service.fetchLatestNonOpenedEvents();
                assert.equal(fetchLatestSpy.calledOnce, false);
            });
        });
        describe('fetchScheduled', function () {
            let service;
            let processEventBatchStub;
            let aggregateStatsStub;
            let setJobTimestampStub;
            let setJobStatusStub;

            beforeEach(function () {
                setJobTimestampStub = sinon.stub().resolves();
                setJobStatusStub = sinon.stub().resolves();
                service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        setJobTimestamp: setJobTimestampStub,
                        setJobStatus: setJobStatusStub
                    },
                    providers: [{
                        fetchLatest: (fn) => {
                            const events = [1,2,3,4,5,6,7,8,9,10];
                            fn(events);
                        }
                    }]
                });
                processEventBatchStub = sinon.stub(service, 'processEventBatch').resolves();
                aggregateStatsStub = sinon.stub(service, 'aggregateStats').resolves();
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns 0 when nothing is scheduled', async function () {
                const result = await service.fetchScheduled();
                assert.equal(result.eventCount, 0);
                assert.equal(processEventBatchStub.called, false);
                assert.equal(aggregateStatsStub.called, false);
            });

            it('returns 0 when fetch is canceled', async function () {
                service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                service.cancelScheduled();
                const result = await service.fetchScheduled();
                assert.equal(result.eventCount, 0);
                assert.equal(processEventBatchStub.called, false);
                assert.equal(aggregateStatsStub.called, false);
            });

            it('fetches events with correct parameters', async function () {
                service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });

                const result = await service.fetchScheduled({maxEvents: 100});

                assert.equal(result.eventCount, 10);
                assert.equal(setJobStatusStub.calledOnce, true);
                assert.equal(processEventBatchStub.calledOnce, true);
            });

            it('bails when end date is before begin date', async function () {
                service.schedule({
                    begin: new Date(2023, 0, 2),
                    end: new Date(2023, 0, 1)
                });
                const result = await service.fetchScheduled({maxEvents: 100});
                assert.equal(result.eventCount, 0);
            });

            it('resets fetchScheduledData when no events are fetched', async function () {
                service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: (fn) => {
                            fn([]);
                        }
                    }]
                });

                service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                const result = await service.fetchScheduled({maxEvents: 100});
                assert.equal(result.eventCount, 0);
            });
        });

        describe('fetchMissing', function () {
            it('fetches missing events', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves(),
                        getLastJobRunTimestamp: sinon.stub().resolves(new Date(Date.now() - 2.5 * 60 * 60 * 1000))
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });
                await service.fetchMissing();
                assert.equal(fetchLatestSpy.calledOnce, true);
            });
        });
    });

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
                    let eventProcessor;
                    beforeEach(function () {
                        eventProcessor = {};
                        eventProcessor.batchGetRecipients = sinon.stub().resolves(new Map());
                        eventProcessor.flushBatchedUpdates = sinon.stub().resolves();
                        eventProcessor.handleDelivered = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleOpened = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handlePermanentFailed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleTemporaryFailed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleUnsubscribed = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                        eventProcessor.handleComplained = sinon.stub().callsFake(({emailId}) => {
                            return {
                                emailId,
                                emailRecipientId: emailId,
                                memberId: 1
                            };
                        });
                    });

                    it('uses passed-in event processor', async function () {
                        const service = new EmailAnalyticsService({
                            config: createMockConfig(),
                            eventProcessor
                        });

                        const result = new EventProcessingResult();
                        const fetchData = {};
                        await service.processEventBatch([{
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

                        assert.equal(eventProcessor.handleDelivered.callCount, 2);
                        assert.equal(eventProcessor.handleOpened.callCount, 1);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleOpened.calledOnce, true);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleDelivered.calledOnce, true);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handlePermanentFailed.calledOnce, true);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleTemporaryFailed.calledOnce, true);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleUnsubscribed.calledOnce, true);
                        assert.equal(eventProcessor.handleDelivered.called, false);
                        assert.equal(eventProcessor.handleOpened.called, false);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleComplained.calledOnce, true);
                        assert.equal(eventProcessor.handleDelivered.called, false);
                        assert.equal(eventProcessor.handleOpened.called, false);

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
                        const service = new EmailAnalyticsService({
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

                        assert.equal(eventProcessor.handleDelivered.called, false);
                        assert.equal(eventProcessor.handleOpened.called, false);

                        assert.deepEqual(result, new EventProcessingResult({
                            unhandled: 1
                        }));

                        assert.deepEqual(fetchData, {
                            lastEventTimestamp: new Date(1)
                        });
                    });
                });

                describe('with null processor results', function () {
                    let eventProcessor;
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
                        const service = new EmailAnalyticsService({
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
                        const service = new EmailAnalyticsService({
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
                        const service = new EmailAnalyticsService({
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
                        const service = new EmailAnalyticsService({
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
                        const service = new EmailAnalyticsService({
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
                        const service = new EmailAnalyticsService({
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

                    const service = new EmailAnalyticsService({
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
                        assert.equal(eventProcessor.batchGetRecipients.calledOnce, true);
                        assert.equal(eventProcessor.flushBatchedUpdates.calledOnce, true);
                    } else {
                        // In sequential mode, should not call batch methods
                        assert.equal(eventProcessor.batchGetRecipients.called, false);
                        assert.equal(eventProcessor.flushBatchedUpdates.called, false);
                    }
                });
            });
        });
    });

    describe('processEvent', function () {
    });

    describe('aggregateStats', function () {
        describe('with batching enabled', function () {
            let service;

            beforeEach(function () {
                configUtils.set('emailAnalytics:batchProcessing', true);
                service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        aggregateEmailStats: sinon.spy(),
                        aggregateMemberStats: sinon.spy(),
                        aggregateMemberStatsBatch: sinon.spy()
                    }
                });
            });

            afterEach(function () {
                configUtils.restore();
            });

            it('calls batched query for member stats', async function () {
                await service.aggregateStats({
                    emailIds: ['e-1', 'e-2'],
                    memberIds: ['m-1', 'm-2']
                });

                assert.equal(service.queries.aggregateEmailStats.calledTwice, true);
                assert.equal(service.queries.aggregateEmailStats.calledWith('e-1'), true);
                assert.equal(service.queries.aggregateEmailStats.calledWith('e-2'), true);

                // In batched mode, aggregateMemberStatsBatch should be called
                assert.equal(service.queries.aggregateMemberStatsBatch.calledOnce, true);
                assert.equal(service.queries.aggregateMemberStatsBatch.calledWith(['m-1', 'm-2']), true);

                // Sequential method should not be called
                assert.equal(service.queries.aggregateMemberStats.called, false);
            });
        });

        describe('with batching disabled', function () {
            let service;

            beforeEach(function () {
                configUtils.set('emailAnalytics:batchProcessing', false);
                service = new EmailAnalyticsService({
                    config: createMockConfig(),
                    queries: {
                        aggregateEmailStats: sinon.spy(),
                        aggregateMemberStats: sinon.spy(),
                        aggregateMemberStatsBatch: sinon.spy()
                    }
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

                assert.equal(service.queries.aggregateEmailStats.calledTwice, true);
                assert.equal(service.queries.aggregateEmailStats.calledWith('e-1'), true);
                assert.equal(service.queries.aggregateEmailStats.calledWith('e-2'), true);

                // In sequential mode, aggregateMemberStats should be called for each member
                assert.equal(service.queries.aggregateMemberStats.calledTwice, true);
                assert.equal(service.queries.aggregateMemberStats.calledWith('m-1'), true);
                assert.equal(service.queries.aggregateMemberStats.calledWith('m-2'), true);

                // Batch method should not be called
                assert.equal(service.queries.aggregateMemberStatsBatch.called, false);
            });
        });
    });

    describe('aggregateEmailStats', function () {
        it('returns the query result', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    aggregateEmailStats: sinon.stub().resolves()
                }
            });

            await service.aggregateEmailStats('memberId');

            assert.equal(service.queries.aggregateEmailStats.calledOnce, true);
            service.queries.aggregateEmailStats.calledWith('memberId').should.be.true;
        });
    });

    describe('aggregateMemberStats', function () {
        it('returns the query result', async function () {
            const service = new EmailAnalyticsService({
                config: createMockConfig(),
                queries: {
                    aggregateMemberStats: sinon.stub().resolves()
                }
            });

            await service.aggregateMemberStats('memberId');

            assert.equal(service.queries.aggregateMemberStats.calledOnce, true);
            service.queries.aggregateMemberStats.calledWith('memberId').should.be.true;
        });
    });
});
