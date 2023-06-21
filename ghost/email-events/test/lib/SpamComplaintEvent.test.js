const assert = require('assert/strict');
const ObjectID = require('bson-objectid').default;
const SpamComplaintEvent = require('../../lib/SpamComplaintEvent');

describe('SpamComplaintEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = SpamComplaintEvent.create({
            email: 'test@test.test',
            memberId: new ObjectID().toHexString(),
            emailId: new ObjectID().toHexString(),
            timestamp: new Date()
        });
        assert(event instanceof SpamComplaintEvent);
    });
});
