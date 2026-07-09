const assert = require('node:assert/strict');
const sinon = require('sinon');
const jobQueue = require('../../../../core/server/services/jobs/queue').default;
const giftRemindersController = require('../../../../core/server/api/endpoints/gift-reminders');

describe('Gift Reminders controller', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('flushReminders', function () {
        it('dispatches a reminder flush job on the queue', function () {
            const dispatch = sinon.stub(jobQueue, 'dispatch');

            const result = giftRemindersController.flushReminders.query({});

            sinon.assert.calledOnce(dispatch);
            assert.equal(dispatch.firstCall.args[0].constructor.type, 'send-gift-reminders');
            assert.equal(result, undefined);
        });
    });
});
