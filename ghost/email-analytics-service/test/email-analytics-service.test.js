// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const sinon = require('sinon');

const {
    EmailAnalyticsService
} = require('..');
const EventProcessingResult = require('../lib/EventProcessingResult');

describe('EmailAnalyticsService', function () {
    describe('getStatus', function () {
        it('returns status object', function () {
            // these are null because we're not running them before calling this
            const service = new EmailAnalyticsService({});
            const result = service.getStatus();
            result.should.deepEqual({
                latest: null,
                missing: null,
                scheduled: null,
                latestOpened: null
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
            result.should.eql(new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(null)
                }
            });

            const result = await service.getLastNonOpenedEventTimestamp();
            result.should.eql(new Date(Date.now() - 30 * 60 * 1000)); // should be 30 mins prior
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
            result.should.eql(new Date(1));
        });

        it('returns the fallback if nothing is found', async function () {
            const service = new EmailAnalyticsService({
                queries: {
                    getLastEventTimestamp: sinon.stub().resolves(null)
                }
            });

            const result = await service.getLastOpenedEventTimestamp();
            result.should.eql(new Date(Date.now() - 30 * 60 * 1000)); // should be 30 mins prior
        });

        it.skip('returns the cached value before the fallback', async function () {
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
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });                
                await service.fetchLatestOpenedEvents();
                fetchLatestSpy.calledOnce.should.be.true();
                fetchLatestSpy.getCall(0).args[1].should.have.property('events', ['opened']);
            });
        });
        describe('fetchLatestNonOpenedEvents', function () {
            it('fetches only non-opened events', async function () {
                const fetchLatestSpy = sinon.spy();
                const service = new EmailAnalyticsService({
                    queries: {
                        getLastEventTimestamp: sinon.stub().resolves()
                    },
                    providers: [{
                        fetchLatest: fetchLatestSpy
                    }]
                });                
                await service.fetchLatestNonOpenedEvents();
                fetchLatestSpy.calledOnce.should.be.true();
                fetchLatestSpy.getCall(0).args[1].should.have.property('events', ['delivered', 'failed', 'unsubscribed', 'complained']);
            });
        });
    });

    describe('processEventBatch', function () {
        let eventProcessor;
        beforeEach(function () {
            eventProcessor = {};
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

            eventProcessor.handleDelivered.callCount.should.eql(2);
            eventProcessor.handleOpened.callCount.should.eql(1);

            result.should.deepEqual(new EventProcessingResult({
                delivered: 2,
                opened: 1,
                unprocessable: 0,
                emailIds: [1, 2],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(3)
            });
        });

        it('handles opened', async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {};

            await service.processEventBatch([{
                type: 'opened',
                emailId: 1,
                timestamp: new Date(1)
            }], result, fetchData);

            eventProcessor.handleOpened.calledOnce.should.be.true();

            result.should.deepEqual(new EventProcessingResult({
                delivered: 0,
                opened: 1,
                unprocessable: 0,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it('handles delivered', async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {};

            await service.processEventBatch([{
                type: 'delivered',
                emailId: 1,
                timestamp: new Date(1)
            }], result, fetchData);

            eventProcessor.handleDelivered.calledOnce.should.be.true();

            result.should.deepEqual(new EventProcessingResult({
                delivered: 1,
                opened: 0,
                unprocessable: 0,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it('handles failed (permanent)', async function () {
            const service = new EmailAnalyticsService({
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

            eventProcessor.handlePermanentFailed.calledOnce.should.be.true();

            result.should.deepEqual(new EventProcessingResult({
                permanentFailed: 1,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it('handles failed (temporary)', async function () {
            const service = new EmailAnalyticsService({
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

            eventProcessor.handleTemporaryFailed.calledOnce.should.be.true();

            result.should.deepEqual(new EventProcessingResult({
                temporaryFailed: 1,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it('handles unsubscribed', async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {};

            await service.processEventBatch([{
                type: 'unsubscribed',
                emailId: 1,
                timestamp: new Date(1)
            }], result, fetchData);

            eventProcessor.handleUnsubscribed.calledOnce.should.be.true();
            eventProcessor.handleDelivered.called.should.be.false();
            eventProcessor.handleOpened.called.should.be.false();

            result.should.deepEqual(new EventProcessingResult({
                unsubscribed: 1,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it('handles complained', async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {};

            await service.processEventBatch([{
                type: 'complained',
                emailId: 1,
                timestamp: new Date(1)
            }], result, fetchData);

            eventProcessor.handleComplained.calledOnce.should.be.true();
            eventProcessor.handleDelivered.called.should.be.false();
            eventProcessor.handleOpened.called.should.be.false();

            result.should.deepEqual(new EventProcessingResult({
                complained: 1,
                emailIds: [1],
                memberIds: [1]
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });

        it(`doens't handle other event types`, async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {};

            await service.processEventBatch([{
                type: 'notstandard',
                emailId: 1,
                timestamp: new Date(1)
            }], result, fetchData);

            eventProcessor.handleDelivered.called.should.be.false();
            eventProcessor.handleOpened.called.should.be.false();

            result.should.deepEqual(new EventProcessingResult({
                unhandled: 1
            }));

            fetchData.should.deepEqual({
                lastEventTimestamp: new Date(1)
            });
        });
    });
    
    describe('processEvent', function () {
    });

    describe('aggregateStats', function () {
        let service;

        beforeEach(function () {
            service = new EmailAnalyticsService({
                queries: {
                    aggregateEmailStats: sinon.spy(),
                    aggregateMemberStats: sinon.spy()
                }
            });
        });

        it('calls appropriate query for each email id and member id', async function () {
            await service.aggregateStats({
                emailIds: ['e-1', 'e-2'],
                memberIds: ['m-1', 'm-2']
            });

            service.queries.aggregateEmailStats.calledTwice.should.be.true();
            service.queries.aggregateEmailStats.calledWith('e-1').should.be.true();
            service.queries.aggregateEmailStats.calledWith('e-2').should.be.true();

            service.queries.aggregateMemberStats.calledTwice.should.be.true();
            service.queries.aggregateMemberStats.calledWith('m-1').should.be.true();
            service.queries.aggregateMemberStats.calledWith('m-2').should.be.true();
        });
    });

    describe('aggregateEmailStats', function () {
        it('returns the query result', async function () {
            const service = new EmailAnalyticsService({
                queries: {
                    aggregateEmailStats: sinon.stub().resolves()
                }
            });

            await service.aggregateEmailStats('memberId');

            service.queries.aggregateEmailStats.calledOnce.should.be.true();
            service.queries.aggregateEmailStats.calledWith('memberId').should.be.true;
        });
    });

    describe('aggregateMemberStats', function () {
        it('returns the query result', async function () {
            const service = new EmailAnalyticsService({
                queries: {
                    aggregateMemberStats: sinon.stub().resolves()
                }
            });

            await service.aggregateMemberStats('memberId');

            service.queries.aggregateMemberStats.calledOnce.should.be.true();
            service.queries.aggregateMemberStats.calledWith('memberId').should.be.true;
        });
    });
});
