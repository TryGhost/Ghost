import assert from 'node:assert/strict';
import sinon from 'sinon';
import Mailgun from '../../../../../core/server/adapters/email/Mailgun';
import type { EmailEvent, SingleMessage } from '@tryghost/adapter-base-email';
import config from '../../../../../core/shared/config';
// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../../../../../core/server/services/lib/mailgun-client';

describe('Mailgun email adapter', () => {
  let adapter: Mailgun;
  let send: sinon.SinonStub;
  const single: SingleMessage = {
    family: 'gifts',
    to: 'reader@example.com',
    from: 'site@example.com',
    subject: 'A gift',
    html: '<p>Gift</p>',
    text: 'Gift',
    disableTracking: true,
  };
  beforeEach(() => {
    sinon.stub(config, 'get').callThrough().withArgs('bulkEmail:mailgun:tag').returns('site-tag');
    send = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: ' <mailgun-id> ' });
    adapter = new Mailgun();
  });
  afterEach(() => sinon.restore());
  it('adapts single-recipient gift delivery and disables all provider tracking', async () => {
    assert.deepEqual(await adapter.sendSingle(single), { id: 'mailgun-id' });
    sinon.assert.calledWithMatch(
      send,
      { tags: ['gift-delivery', 'site-tag'], plaintext: 'Gift', disable_tracking: true },
      { 'reader@example.com': {} },
      [],
    );
  });
  it('retains automation unsubscribe headers and open tracking', async () => {
    await adapter.sendSingle({
      ...single,
      family: 'automations',
      disableTracking: false,
      trackOpens: true,
      listUnsubscribe: 'https://example.com/unsubscribe',
    });
    sinon.assert.calledWithMatch(
      send,
      { tags: ['automation-email', 'site-tag'], track_opens: true },
      { 'reader@example.com': { list_unsubscribe: 'https://example.com/unsubscribe' } },
      [],
    );
    assert.equal(send.firstCall.args[0].disable_tracking, undefined);
  });
  it('rejects an unconfigured client that did not attempt a send', async () => {
    send.resolves(null);
    await assert.rejects(adapter.sendSingle(single), { code: 'EMAIL_NOT_ACCEPTED' });
  });
  it('preserves acceptance when a successful response has no tracking ID', async () => {
    send.resolves({});
    assert.deepEqual(await adapter.sendSingle(single), { id: null });
    send.rejects(new Error('send rejected'));
    await assert.rejects(adapter.sendSingle(single), /send rejected/);
  });
  it('normalizes polling IDs and preserves the existing Mailgun suppression policy', async () => {
    const raw = {
      id: 'failure',
      type: 'failed',
      severity: 'permanent',
      providerId: '<message>',
      timestamp: new Date(),
      recipientEmail: single.to,
      error: { code: 605, message: 'Suppressed' },
    };
    const fetch = sinon
      .stub(MailgunClient.prototype, 'fetchEvents')
      .callsFake(async (_options: unknown, handler: (events: unknown[]) => Promise<void>) => {
        await handler([raw, { ...raw, id: 'rejected', error: { code: 550, message: 'Rejected' } }]);
      });
    const source = adapter.getEventSource();
    assert.equal(source.type, 'poll');
    if (source.type !== 'poll') {
      assert.fail('Expected polling');
    }
    const received: EmailEvent[] = [];
    await source.fetch({
      family: 'automations',
      begin: new Date(),
      end: new Date(),
      maxEvents: 100,
      batchHandler: async (events) => {
        received.push(...events);
      },
    });
    assert.equal(fetch.firstCall.args[0].tags, 'automation-email AND site-tag');
    assert.equal(received[0].providerId, 'message');
    assert.equal(received[0].family, 'automations');
    assert.equal(received[0].suppress, true);
    assert.equal(received[1].suppress, false);
  });
  it('removes suppressions using the owning provider API', async () => {
    const remove = sinon.stub(MailgunClient.prototype, 'removeComplaint').resolves();
    await adapter.removeSuppression(single.to, 'complaint');
    sinon.assert.calledOnceWithExactly(remove, single.to);
  });
});
