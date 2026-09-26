import sinon from 'sinon';
import logging from '@tryghost/logging';
// @ts-expect-error This module lacks type definitions.
import MailgunEmailSuppressionList from '../../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list';
import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import emailSuppressionList from '../../../../../core/server/services/email-suppression-list/email-suppression-list';
const { EmailSuppressionData, EmailSuppressedEvent } = emailSuppressionList;

describe('EmailSuppressionData', function () {
  it('Has null info when not suppressed', function () {
    const now = new Date();
    const data = new EmailSuppressionData(false, {
      reason: 'spam',
      timestamp: now,
    });

    assert(data.suppressed === false);
    assert(data.info === null);
  });
  it('Has info when suppressed', function () {
    const now = new Date();
    const data = new EmailSuppressionData(true, {
      reason: 'spam',
      timestamp: now,
    });

    assert(data.suppressed === true);
    assert(data.info.reason === 'spam');
    assert(data.info.timestamp === now);
  });
});

describe('EmailSuppressedEvent', function () {
  it('Exposes a create factory method', function () {
    const event = EmailSuppressedEvent.create({
      emailAddress: 'test@test.com',
      emailId: '1234567890abcdef',
      reason: 'spam',
    });
    assert(event instanceof EmailSuppressedEvent);
    assert(event.timestamp);
  });
});

describe('provider suppression cleanup policy', () => {
  afterEach(() => sinon.restore());
  for (const [method, reason] of [
    ['removeComplaint', 'complaint'],
    ['removeUnsubscribe', 'unsubscribe'],
  ]) {
    it(`${method} propagates webhook cleanup failures but allows polling to continue`, async () => {
      const failure = new Error('provider unavailable');
      const remove = sinon.stub().rejects(failure);
      const log = sinon.stub(logging, 'error');
      const service = new MailgunEmailSuppressionList({ apiClient: { [method]: remove } });
      await assert.rejects(service[method]('reader@example.com', { requireSuccess: true }), {
        statusCode: 503,
        message: `Could not remove provider ${reason}`,
      });
      assert.equal(await service[method]('reader@example.com', { requireSuccess: false }), false);
      assert.equal(await service[method]('reader@example.com'), false);
      sinon.assert.calledThrice(log);

      remove.resolves();
      assert.equal(await service[method]('reader@example.com'), undefined);
      sinon.assert.alwaysCalledWithExactly(remove, 'reader@example.com');
      sinon.assert.alwaysCalledOn(remove, service.apiClient);
    });
  }
});
