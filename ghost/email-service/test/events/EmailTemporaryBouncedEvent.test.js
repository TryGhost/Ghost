const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const EmailTemporaryBouncedEvent = require('../../lib/events/EmailTemporaryBouncedEvent');

describe('EmailTemporaryBouncedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = EmailTemporaryBouncedEvent.create({
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
        assert(event instanceof EmailTemporaryBouncedEvent);
    });
});
