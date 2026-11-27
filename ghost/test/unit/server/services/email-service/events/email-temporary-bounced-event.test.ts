import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import { EmailTemporaryBouncedEvent } from '../../../../../../core/server/services/email-service/events/email-temporary-bounced-event';

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
        enhancedCode: '1.1',
      },
    });
    assert(event instanceof EmailTemporaryBouncedEvent);
  });
});
