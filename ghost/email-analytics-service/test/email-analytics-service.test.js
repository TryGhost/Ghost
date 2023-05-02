// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const sinon = require('sinon');

const {
    EmailAnalyticsService
} = require('..');
const EventProcessingResult = require('../lib/EventProcessingResult');

describe('EmailAnalyticsService', function () {
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
    });

    describe('fetchLatest', function () {

    });

    describe('processEventBatch', function () {
        it('uses passed-in event processor', async function () {
            const service = new EmailAnalyticsService({
                eventProcessor
            });

            const result = new EventProcessingResult();
            const fetchData = {

            };
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
});
