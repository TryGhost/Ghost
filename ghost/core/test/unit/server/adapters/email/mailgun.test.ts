import assert from 'node:assert/strict';
import sinon from 'sinon';
import MailgunEmail from '../../../../../core/server/adapters/email/MailgunEmail';
import type { EmailEvent, SingleMessage } from '@tryghost/adapter-base-email';
import config from '../../../../../core/shared/config';
import { validateProvider } from '../../../../../core/server/services/email-provider';
// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../../../../../core/server/services/lib/mailgun-client';

describe('MailgunEmail email adapter', () => {
  let adapter: MailgunEmail;
  let send: sinon.SinonStub;
  let configGet: sinon.SinonStub;
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
    configGet = sinon.stub(config, 'get').callThrough();
    configGet.withArgs('bulkEmail:mailgun:tag').returns('site-tag');
    send = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: ' <mailgun-id> ' });
    adapter = new MailgunEmail();
  });
  afterEach(() => sinon.restore());
  for (const batchSize of [1000, '1000']) {
    it(`accepts a ${typeof batchSize} Mailgun batch size during provider validation`, () => {
      configGet.withArgs('bulkEmail').returns({ batchSize });
      assert.doesNotThrow(() => validateProvider(adapter));
      assert.equal(adapter.getMaximumRecipients(), 1000);
    });
  }
  it('retains the default batch size when none is configured', () => {
    configGet.withArgs('bulkEmail').returns({});
    assert.doesNotThrow(() => validateProvider(adapter));
    assert.equal(adapter.getMaximumRecipients(), 1000);
  });
  it('continues to reject invalid recipient limits during provider validation', () => {
    for (const batchSize of [0, -1, 1.5, '1000invalid', '', 'Infinity', true]) {
      configGet.withArgs('bulkEmail').returns({ batchSize });
      assert.throws(
        () => validateProvider(adapter),
        /Email provider recipient limit must be positive/,
      );
    }
  });
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
  it('preserves unconfigured automation sends as a no-op while rejecting gift sends', async () => {
    send.resolves(null);
    assert.deepEqual(await adapter.sendSingle({ ...single, family: 'automations' }), { id: null });
    await assert.rejects(adapter.sendSingle(single), { code: 'EMAIL_NOT_ACCEPTED' });
  });
  it('preserves acceptance when a successful response has no tracking ID', async () => {
    send.resolves({});
    assert.deepEqual(await adapter.sendSingle(single), { id: null });
    send.rejects(new Error('send rejected'));
    for (const family of ['gifts', 'automations'] as const) {
      await assert.rejects(adapter.sendSingle({ ...single, family }), /send rejected/);
    }
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
