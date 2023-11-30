const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const EmailDeliveredEvent = require('../../lib/EmailDeliveredEvent');

describe('EmailDeliveredEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = EmailDeliveredEvent.create({
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString(),
            emailRecipientId: new ObjectID().toHexString(),
            timestamp: new Date()
        });
        assert(event instanceof EmailDeliveredEvent);
    });
});
