const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const giftRemindersController = require('../../../../core/server/api/endpoints/gift-reminders');
const StartGiftReminderFlushEvent = require('../../../../core/server/services/gifts/events/start-gift-reminder-flush-event');

describe('Gift Reminders controller', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('flushReminders', function () {
        it('dispatches a StartGiftReminderFlushEvent', function () {
            const dispatchStub = sinon.stub(domainEvents, 'dispatch');

            const result = giftRemindersController.flushReminders.query({});

            sinon.assert.calledOnceWithExactly(
                dispatchStub,
                sinon.match.instanceOf(StartGiftReminderFlushEvent)
            );
            assert.equal(result, undefined);
        });
    });
});
