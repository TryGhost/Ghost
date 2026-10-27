import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import { EmailOpenedEvent } from '../../../../../../core/server/services/email-service/events/email-opened-event';

describe('EmailOpenedEvent', function () {
  it('exports a static create method to create instances', function () {
    const event = EmailOpenedEvent.create({
      email: 'test@test.test',
      memberId: new ObjectID().toHexString(),
      emailId: new ObjectID().toHexString(),
      emailRecipientId: new ObjectID().toHexString(),
      timestamp: new Date(),
    });
    assert(event instanceof EmailOpenedEvent);
  });
});
