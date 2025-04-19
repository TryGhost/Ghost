const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const EmailBouncedEvent = require('../../lib/events/EmailBouncedEvent');

describe('EmailBouncedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = EmailBouncedEvent.create({
            id: 'id',
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString(),
            emailRecipientId: new ObjectID().toHexString(),
            timestamp: new Date(),
            error: {
                message: 'test',
                code: 1,
                enhancedCode: '1.1'
            }
        });
        assert(event instanceof EmailBouncedEvent);
    });
});
