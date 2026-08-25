import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import { EmailDeliveredEvent } from '../../../../../../core/server/services/email-service/events/email-delivered-event';

describe('EmailDeliveredEvent', function () {
  it('exports a static create method to create instances', function () {
    const event = EmailDeliveredEvent.create({
      email: 'test@test.test',
      memberId: new ObjectID().toHexString(),
      emailId: new ObjectID().toHexString(),
      emailRecipientId: new ObjectID().toHexString(),
      timestamp: new Date(),
    });
    assert(event instanceof EmailDeliveredEvent);
  });
});
