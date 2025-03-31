const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const EmailUnsubscribedEvent = require('../../lib/events/EmailUnsubscribedEvent');

describe('EmailUnsubscribedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString(),
            timestamp: new Date()
        });
        assert(event instanceof EmailUnsubscribedEvent);
    });

    it('can create an instance without a timestamp', function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString()
        });
        assert(event instanceof EmailUnsubscribedEvent);
        assert(event.timestamp instanceof Date);
    });
});
