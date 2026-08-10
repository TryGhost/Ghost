const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const giftsController = require('../../../../core/server/api/endpoints/gifts');
const StartGiftReminderFlushEvent = require('../../../../core/server/services/gifts/events/start-gift-reminder-flush-event');
const StartGiftDeliveryFlushEvent = require('../../../../core/server/services/gifts/events/start-gift-delivery-flush-event');

describe('Gifts controller', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('flushReminders', function () {
        it('dispatches a StartGiftReminderFlushEvent', function () {
            const dispatchStub = sinon.stub(domainEvents, 'dispatch');

            const result = giftsController.flushReminders.query({});

            sinon.assert.calledOnceWithExactly(
                dispatchStub,
                sinon.match.instanceOf(StartGiftReminderFlushEvent)
            );
            assert.equal(result, undefined);
        });
    });

    describe('flushDeliveries', function () {
        it('dispatches a StartGiftDeliveryFlushEvent', function () {
            const dispatchStub = sinon.stub(domainEvents, 'dispatch');

            const result = giftsController.flushDeliveries.query({});

            sinon.assert.calledOnceWithExactly(
                dispatchStub,
                sinon.match.instanceOf(StartGiftDeliveryFlushEvent)
            );
            assert.equal(result, undefined);
        });
    });
});
