const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const EmailOpenedEvent = require('../../lib/EmailOpenedEvent');

describe('EmailOpenedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = EmailOpenedEvent.create({
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString(),
            emailRecipientId: new ObjectID().toHexString(),
            timestamp: new Date()
        });
        assert(event instanceof EmailOpenedEvent);
    });
});
