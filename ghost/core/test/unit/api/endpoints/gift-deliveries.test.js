const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const giftDeliveriesController = require('../../../../core/server/api/endpoints/gift-deliveries');
const StartGiftDeliveryFlushEvent = require('../../../../core/server/services/gifts/events/start-gift-delivery-flush-event');

describe('Gift Deliveries controller', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('flushDeliveries', function () {
        it('dispatches a StartGiftDeliveryFlushEvent', function () {
            const dispatchStub = sinon.stub(domainEvents, 'dispatch');

            const result = giftDeliveriesController.flushDeliveries.query({});

            sinon.assert.calledOnceWithExactly(
                dispatchStub,
                sinon.match.instanceOf(StartGiftDeliveryFlushEvent)
            );
            assert.equal(result, undefined);
        });
    });
});
