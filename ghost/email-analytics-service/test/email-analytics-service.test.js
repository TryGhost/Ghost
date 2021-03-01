// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const sinon = require('sinon');

const {
    EmailAnalyticsService,
    EventProcessor
} = require('..');
const EventProcessingResult = require('../lib/event-processing-result');

describe('EmailAnalyticsService', function () {
    describe('fetchAll', function () {
        let eventProcessor;
        let providers;
        let queries;

        beforeEach(function () {
            eventProcessor = new EventProcessor();
            eventProcessor.handleDelivered = sinon.fake.resolves(true);
            eventProcessor.handleOpened = sinon.fake.resolves(true);

            providers = {
                testing: {
                    async fetchAll(batchHandler) {
                        const result = new EventProcessingResult();

                        // first page
                        result.merge(await batchHandler([{
                            type: 'delivered',
                            emailId: 1,
                            memberId: 1
                        }, {
                            type: 'delivered',
                            emailId: 1,
                            memberId: 1
                        }]));

                        // second page
                        result.merge(await batchHandler([{
                            type: 'opened',
                            emailId: 1,
                            memberId: 1
                        }, {
                            type: 'opened',
                            emailId: 1,
                            memberId: 1
                        }]));

                        return result;
                    }
                }
            };

            queries = {
                shouldFetchStats: sinon.fake.resolves(true)
            };
        });

        it('uses passed-in providers', async function () {
            const service = new EmailAnalyticsService({
                queries,
                eventProcessor,
                providers
            });

            const result = await service.fetchAll();

            queries.shouldFetchStats.calledOnce.should.be.true();
            eventProcessor.handleDelivered.calledTwice.should.be.true();

            result.should.deepEqual(new EventProcessingResult({
                delivered: 2,
                opened: 2,
                emailIds: [1],
                memberIds: [1]
            }));
        });

        it('skips if queries.shouldFetchStats is falsy', async function () {
            queries.shouldFetchStats = sinon.fake.resolves(false);

            const service = new EmailAnalyticsService({
                queries,
                eventProcessor,
                providers
            });

            const result = await service.fetchAll();

            queries.shouldFetchStats.calledOnce.should.be.true();
            eventProcessor.handleDelivered.called.should.be.false();

            result.should.deepEqual(new EventProcessingResult());
        });
    });

    describe('fetchLatest', function () {

    });

    describe('processEventBatch', function () {
        it('uses passed-in event processor', async function () {
            const eventProcessor = new EventProcessor();
            eventProcessor.handleDelivered = sinon.stub().resolves(true);

            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = await service.processEventBatch([{
                type: 'delivered',
                emailId: 1
            }, {
                type: 'delivered',
                emailId: 2
            }, {
                type: 'opened',
                emailId: 1
            }]);

            eventProcessor.handleDelivered.callCount.should.eql(2);

            result.should.deepEqual(new EventProcessingResult({
                delivered: 2,
                unprocessable: 1,
                emailIds: [1, 2]
            }));
        });
    });

    describe('aggregateStats', function () {
        let service;

        beforeEach(function () {
            service = new EmailAnalyticsService({
                logging: sinon.spy(),
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
});
