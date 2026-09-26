import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Knex } from 'knex';
import type { EmailEvent } from '@tryghost/adapter-base-email';
import { EmailEventService } from '../../../../../core/server/services/email-provider/event-service';
import {
  EmailEventRepository,
  EmailRecipientNotFoundError,
} from '../../../../../core/server/services/email-provider/event-repository';

describe('email event processing', () => {
  let clock: sinon.SinonFakeTimers;
  let apply: sinon.SinonStub;
  let transaction: sinon.SinonStub;
  let verify: sinon.SinonStub;
  let removeSuppression: sinon.SinonStub;
  let aggregateEmailStats: sinon.SinonStub;
  let recordOutcome: sinon.SinonStub;
  let service: EmailEventService;
  const event: EmailEvent = {
    id: 'event-1',
    family: 'newsletters',
    type: 'delivered',
    recipientEmail: 'reader@example.com',
    providerId: 'message-1',
    timestamp: new Date('2026-09-01T12:00:00Z'),
    suppress: false,
  };
  const request = { body: Buffer.from('{}'), headers: {} };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    apply = sinon.stub(EmailEventRepository.prototype, 'apply').resolves({ emailId: 'email-1' });
    transaction = sinon.stub().callsFake(async (callback) => callback({}));
    verify = sinon.stub().resolves({ events: [event] });
    removeSuppression = sinon.stub().resolves();
    aggregateEmailStats = sinon.stub().resolves();
    recordOutcome = sinon.stub().resolves('recorded');
    service = new EmailEventService({
      knex: { transaction } as unknown as Knex,
      provider: {
        source: 'provider',
        getEventSource: () => ({ type: 'webhook', verify }),
        removeSuppression,
      },
      queries: { aggregateEmailStats, aggregateMemberStatsBatch: sinon.stub().resolves() },
      gifts: { recordOutcome },
    });
  });
  afterEach(() => sinon.restore());

  it('processes matching events without delaying or retrying', async () => {
    await service.webhook('provider', request);
    sinon.assert.calledOnce(apply);
    sinon.assert.calledOnceWithExactly(aggregateEmailStats, 'email-1', true);
    assert.equal(clock.countTimers(), 0);
  });

  it('retries an unmatched webhook once after 500 ms', async () => {
    apply.onFirstCall().rejects(new EmailRecipientNotFoundError());
    const pending = service.webhook('provider', request);
    await clock.tickAsync(499);
    sinon.assert.calledOnce(apply);
    sinon.assert.notCalled(aggregateEmailStats);
    await clock.tickAsync(1);
    await pending;
    sinon.assert.calledTwice(apply);
    sinon.assert.calledTwice(transaction);
    sinon.assert.calledOnce(verify);
    sinon.assert.calledOnce(aggregateEmailStats);
    assert.equal(clock.countTimers(), 0);
  });

  it('returns 503 when the second lookup fails and schedules no further retry', async () => {
    apply.rejects(new EmailRecipientNotFoundError());
    const rejected = assert.rejects(service.webhook('provider', request), {
      code: 'EMAIL_RECIPIENT_NOT_FOUND',
      statusCode: 503,
    });
    await clock.tickAsync(500);
    await rejected;
    await clock.tickAsync(5000);
    sinon.assert.calledTwice(apply);
    sinon.assert.notCalled(aggregateEmailStats);
    assert.equal(clock.countTimers(), 0);
  });

  it('skips unmatched polling recipients without delaying or retrying', async () => {
    apply.rejects(new EmailRecipientNotFoundError());
    await service.ingest([event], 'newsletters');
    sinon.assert.calledOnce(apply);
    sinon.assert.notCalled(aggregateEmailStats);
    assert.equal(clock.countTimers(), 0);
  });

  it('does not retry database failures as missing recipients', async () => {
    const error = new Error('Database unavailable');
    apply.rejects(error);
    await assert.rejects(service.webhook('provider', request), error);
    sinon.assert.calledOnce(apply);
    assert.equal(clock.countTimers(), 0);
  });

  it('does not retry or apply unverified notifications', async () => {
    const error = new Error('Invalid signature');
    verify.rejects(error);
    await assert.rejects(service.webhook('provider', request), error);
    sinon.assert.notCalled(apply);
    assert.equal(clock.countTimers(), 0);
  });

  it('rejects invalid sources and event families without processing', async () => {
    await assert.rejects(service.webhook('unknown', request), /source was not found/);
    await assert.rejects(service.ingest([event], 'automations'), /wrong family/);
    sinon.assert.notCalled(apply);
    assert.equal(clock.countTimers(), 0);
  });

  it('does not reapply events when provider cleanup fails', async () => {
    const error = new Error('Provider unavailable');
    apply.resolves({ cleanup: 'unsubscribe' });
    removeSuppression.rejects(error);
    await assert.rejects(service.webhook('provider', request), error);
    sinon.assert.calledOnce(apply);
    sinon.assert.calledOnceWithExactly(removeSuppression, event.recipientEmail, 'unsubscribe');
    assert.equal(clock.countTimers(), 0);
  });

  it('keeps the webhook pending until aggregates finish', async () => {
    let complete!: () => void;
    aggregateEmailStats.callsFake(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    let finished = false;
    const pending = service.webhook('provider', request).then(() => {
      finished = true;
    });
    await clock.tickAsync(0);
    assert.equal(finished, false);
    complete();
    await pending;
    assert.equal(finished, true);
  });

  it('keeps gift outcomes in the gift service and propagates failures', async () => {
    verify.resolves({ events: [{ ...event, family: 'gifts' }] });
    const error = new Error('Gift notification failed');
    recordOutcome.rejects(error);
    await assert.rejects(service.webhook('provider', request), error);
    sinon.assert.calledOnceWithExactly(recordOutcome, {
      providerMessageId: event.providerId,
      outcome: 'delivered',
      timestamp: event.timestamp,
      error: null,
    });
    sinon.assert.calledOnce(apply);
    assert.equal(clock.countTimers(), 0);
  });
});
