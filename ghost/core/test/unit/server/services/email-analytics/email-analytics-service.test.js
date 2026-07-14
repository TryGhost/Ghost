const assert = require('node:assert/strict');

const sinon = require('sinon');

const EmailAnalyticsService = require('../../../../../core/server/services/email-analytics/email-analytics-service');

/**
 * Create a stub implementing the EventProcessor interface.
 */
function createStubEventProcessor() {
    return {
        processBatch: sinon.stub().resolves(),
        aggregate: sinon.stub().resolves({emailAggregationTimeMs: 0, memberAggregationTimeMs: 0})
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
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(new Date(1))
                }
            });

            const result = await service.getLastNonOpenedEventTimestamp();
            assert.deepEqual(result, new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
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
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(new Date(1))
                }
            });

            const result = await service.getLastOpenedEventTimestamp();
            assert.deepEqual(result, new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
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
                const eventProcessor = createStubEventProcessor();
                const service = new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(),
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: fetchLatestSpy
                    },
                    createEventProcessor: () => eventProcessor
                });
                await service.fetchLatestOpenedEvents();
                sinon.assert.calledOnce(fetchLatestSpy);
                assert.deepEqual(fetchLatestSpy.getCall(0).args[1].events, ['opened']);

                // The final aggregation is delegated to the event processor
                sinon.assert.calledOnce(eventProcessor.aggregate);
                sinon.assert.calledWithMatch(eventProcessor.aggregate, {
                    includeOpenedEvents: true,
                    isFinal: true
                });
            });

            it('quits if the end is before the begin', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours in the future
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: fetchLatestSpy
                    },
                    createEventProcessor: createStubEventProcessor
                });
                await service.fetchLatestOpenedEvents();
                sinon.assert.notCalled(fetchLatestSpy);
            });
        });

        describe('fetchLatestNonOpenedEvents', function () {
            it('fetches only non-opened events', async function () {
                const fetchLatestSpy = sinon.spy();
                const eventProcessor = createStubEventProcessor();
                const service = new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(),
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: fetchLatestSpy
                    },
                    createEventProcessor: () => eventProcessor
                });
                await service.fetchLatestNonOpenedEvents();
                sinon.assert.calledOnce(fetchLatestSpy);
                assert.deepEqual(fetchLatestSpy.getCall(0).args[1].events, ['delivered', 'failed', 'unsubscribed', 'complained']);

                // The final aggregation is delegated to the event processor
                sinon.assert.calledOnce(eventProcessor.aggregate);
                sinon.assert.calledWithMatch(eventProcessor.aggregate, {
                    includeOpenedEvents: false,
                    isFinal: true
                });
            });

            it('quits if the end is before the begin', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours in the future
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: fetchLatestSpy
                    },
                    createEventProcessor: createStubEventProcessor
                });
                await service.fetchLatestNonOpenedEvents();
                sinon.assert.notCalled(fetchLatestSpy);
            });
        });

        describe('fetchScheduled', function () {
            let service;
            let eventProcessor;
            let setJobTimestampStub;
            let setJobStatusStub;
            let setJobMetadataStub;

            beforeEach(function () {
                setJobTimestampStub = sinon.stub().resolves();
                setJobStatusStub = sinon.stub().resolves();
                setJobMetadataStub = sinon.stub().resolves();
                eventProcessor = createStubEventProcessor();
                service = new EmailAnalyticsService({
                    queries: {
                        setJobTimestamp: setJobTimestampStub,
                        setJobStatus: setJobStatusStub,
                        setJobMetadata: setJobMetadataStub
                    },
                    provider: {
                        fetchLatest: (fn) => {
                            const events = [1,2,3,4,5,6,7,8,9,10];
                            fn(events);
                        }
                    },
                    createEventProcessor: () => eventProcessor
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns 0 when nothing is scheduled', async function () {
                const result = await service.fetchScheduled();
                assert.equal(result.eventCount, 0);
                sinon.assert.notCalled(eventProcessor.processBatch);
                sinon.assert.notCalled(eventProcessor.aggregate);
            });

            it('returns 0 when fetch is canceled', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                service.cancelScheduled();
                const result = await service.fetchScheduled();
                assert.equal(result.eventCount, 0);
                sinon.assert.notCalled(eventProcessor.processBatch);
                sinon.assert.notCalled(eventProcessor.aggregate);
            });

            it('fetches events with correct parameters', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });

                const result = await service.fetchScheduled({maxEvents: 100});

                assert.equal(result.eventCount, 10);
                sinon.assert.calledOnce(setJobStatusStub);
                sinon.assert.calledOnce(eventProcessor.processBatch);
                assert.deepEqual(eventProcessor.processBatch.getCall(0).args[0], [1,2,3,4,5,6,7,8,9,10]);
            });

            it('bails when end date is before begin date', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 2),
                    end: new Date(2023, 0, 1)
                });
                const result = await service.fetchScheduled({maxEvents: 100});
                assert.equal(result.eventCount, 0);
            });

            it('resets fetchScheduledData when no events are fetched', async function () {
                service = new EmailAnalyticsService({
                    queries: {
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves(),
                        setJobMetadata: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: (fn) => {
                            fn([]);
                        }
                    },
                    createEventProcessor: createStubEventProcessor
                });

                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                const result = await service.fetchScheduled({maxEvents: 100});
                assert.equal(result.eventCount, 0);
            });
        });

        describe('schedule persistence', function () {
            let setJobMetadataStub;
            let service;

            beforeEach(function () {
                setJobMetadataStub = sinon.stub().resolves();
                service = new EmailAnalyticsService({
                    queries: {
                        setJobMetadata: setJobMetadataStub,
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: (fn) => {
                            fn([]);
                        }
                    },
                    createEventProcessor: createStubEventProcessor
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('persists metadata when scheduling', async function () {
                const begin = new Date(2023, 0, 1);
                const end = new Date(2023, 0, 2);
                await service.schedule({begin, end});

                sinon.assert.calledOnce(setJobMetadataStub);
                sinon.assert.calledWith(setJobMetadataStub, 'email-analytics-scheduled', {
                    begin: begin.toISOString(),
                    end: end.toISOString()
                });
            });

            it('clears metadata when canceling a non-running schedule', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                setJobMetadataStub.resetHistory();

                service.cancelScheduled();

                sinon.assert.calledOnce(setJobMetadataStub);
                sinon.assert.calledWith(setJobMetadataStub, 'email-analytics-scheduled', null);
            });

            it('clears metadata when fetchScheduled completes with no events', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                setJobMetadataStub.resetHistory();

                await service.fetchScheduled({maxEvents: 100});

                sinon.assert.calledOnce(setJobMetadataStub);
                sinon.assert.calledWith(setJobMetadataStub, 'email-analytics-scheduled', null);
            });

            it('clears metadata when fetchScheduled finds end before begin', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 2),
                    end: new Date(2023, 0, 1)
                });
                setJobMetadataStub.resetHistory();

                await service.fetchScheduled({maxEvents: 100});

                sinon.assert.calledOnce(setJobMetadataStub);
                sinon.assert.calledWith(setJobMetadataStub, 'email-analytics-scheduled', null);
            });

            it('clears metadata when cancel is called on a non-running schedule', async function () {
                await service.schedule({
                    begin: new Date(2023, 0, 1),
                    end: new Date(2023, 0, 2)
                });
                setJobMetadataStub.resetHistory();

                service.cancelScheduled();

                // cancelScheduled on non-running calls #clearScheduledData which clears metadata
                sinon.assert.calledOnce(setJobMetadataStub);
                sinon.assert.calledWith(setJobMetadataStub, 'email-analytics-scheduled', null);

                // Subsequent fetchScheduled should be a no-op (nothing scheduled)
                const result = await service.fetchScheduled();
                assert.equal(result.eventCount, 0);
            });
        });

        describe('aggregation error handling', function () {
            function createService(eventProcessor) {
                return new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves(),
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves()
                    },
                    provider: {
                        fetchLatest: async (fn) => {
                            await fn([{type: 'delivered', timestamp: new Date(1)}]);
                        }
                    },
                    createEventProcessor: () => eventProcessor
                });
            }

            it('does not fail the fetch when an intermediate aggregation fails', async function () {
                const eventProcessor = createStubEventProcessor();
                eventProcessor.aggregate
                    .withArgs(sinon.match({isFinal: false}))
                    .rejects(new Error('intermediate aggregation failed'));
                const service = createService(eventProcessor);

                const result = await service.fetchLatestOpenedEvents();

                assert.equal(result.eventCount, 1);
                // Both the (failed) intermediate and the final aggregation ran
                sinon.assert.calledTwice(eventProcessor.aggregate);
                assert.equal(eventProcessor.aggregate.lastCall.args[0].isFinal, true);
            });

            it('rejects when the final aggregation fails', async function () {
                const eventProcessor = createStubEventProcessor();
                eventProcessor.aggregate
                    .withArgs(sinon.match({isFinal: true}))
                    .rejects(new Error('final aggregation failed'));
                const service = createService(eventProcessor);

                await assert.rejects(service.fetchLatestOpenedEvents(), /final aggregation failed/);
            });
        });

        describe('restoreScheduled', function () {
            afterEach(function () {
                sinon.restore();
            });

            it('restores schedule from persisted metadata', async function () {
                const begin = new Date(2023, 0, 1);
                const end = new Date(2023, 0, 8);
                const finishedAt = new Date(2023, 0, 3);

                const service = new EmailAnalyticsService({
                    queries: {
                        getJobData: sinon.stub().resolves({
                            finished_at: finishedAt,
                            started_at: null,
                            metadata: JSON.stringify({
                                begin: begin.toISOString(),
                                end: end.toISOString()
                            })
                        }),
                        setJobMetadata: sinon.stub().resolves()
                    }
                });

                await service.restoreScheduled();

                const status = service.getStatus();
                assert.deepEqual(status.scheduled.schedule, {begin, end});
                assert.deepEqual(status.scheduled.lastEventTimestamp, finishedAt);
                assert.equal(status.scheduled.running, false);
            });

            it('does nothing when no job data exists', async function () {
                const service = new EmailAnalyticsService({
                    queries: {
                        getJobData: sinon.stub().resolves(null),
                        setJobMetadata: sinon.stub().resolves()
                    }
                });

                await service.restoreScheduled();

                const status = service.getStatus();
                assert.equal(status.scheduled.schedule, undefined);
            });

            it('does nothing when metadata is null', async function () {
                const service = new EmailAnalyticsService({
                    queries: {
                        getJobData: sinon.stub().resolves({
                            finished_at: null,
                            started_at: null,
                            metadata: null
                        }),
                        setJobMetadata: sinon.stub().resolves()
                    }
                });

                await service.restoreScheduled();

                const status = service.getStatus();
                assert.equal(status.scheduled.schedule, undefined);
            });

            it('restores without resume cursor when finished_at is null', async function () {
                const begin = new Date(2023, 0, 1);
                const end = new Date(2023, 0, 8);

                const service = new EmailAnalyticsService({
                    queries: {
                        getJobData: sinon.stub().resolves({
                            finished_at: null,
                            started_at: null,
                            metadata: JSON.stringify({
                                begin: begin.toISOString(),
                                end: end.toISOString()
                            })
                        }),
                        setJobMetadata: sinon.stub().resolves()
                    }
                });

                await service.restoreScheduled();

                const status = service.getStatus();
                assert.deepEqual(status.scheduled.schedule, {begin, end});
                assert.equal(status.scheduled.lastEventTimestamp, undefined);
            });

            it('handles corrupt metadata gracefully', async function () {
                const service = new EmailAnalyticsService({
                    queries: {
                        getJobData: sinon.stub().resolves({
                            finished_at: null,
                            started_at: null,
                            metadata: 'not-valid-json'
                        }),
                        setJobMetadata: sinon.stub().resolves()
                    }
                });

                await service.restoreScheduled();

                const status = service.getStatus();
                assert.equal(status.scheduled.schedule, undefined);
            });
        });

        describe('fetchMissing', function () {
            it('fetches missing events', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    queries: {
                        setJobTimestamp: sinon.stub().resolves(),
                        setJobStatus: sinon.stub().resolves(),
                        getLastJobRunTimestamp: sinon.stub().resolves(new Date(Date.now() - 2.5 * 60 * 60 * 1000))
                    },
                    provider: {
                        fetchLatest: fetchLatestSpy
                    },
                    createEventProcessor: createStubEventProcessor
                });
                await service.fetchMissing();
                sinon.assert.calledOnce(fetchLatestSpy);
            });
        });
    });
});
