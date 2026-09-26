import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { EmailEvent } from '@tryghost/adapter-base-email';
import {
  EmailEventService,
  parseEmailEvents,
} from '../../../../../core/server/services/email-provider/event-service';
import type { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';

describe('email webhook delegation', () => {
  let clock: sinon.SinonFakeTimers;
  let processBatch: sinon.SinonStub;
  let aggregate: sinon.SinonStub;
  let verify: sinon.SinonStub;
  let createEventProcessor: sinon.SinonStub;
  let service: EmailEventService;
  const event: EmailEvent = {
    id: 'event-1',
    family: 'newsletters',
    type: 'delivered',
    recipientEmail: 'reader@example.com',
    providerId: '<Opaque-ID>',
    timestamp: new Date('2026-09-01T12:00:00Z'),
    suppress: false,
  };
  const request = { body: Buffer.from('{}'), headers: {} };
  const missing = (_events: EmailEvent[], result: EventProcessingResult) => {
    result.unprocessable += 1;
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    processBatch = sinon.stub().callsFake(async (_events, result) => {
      result.delivered += 1;
    });
    aggregate = sinon.stub().resolves(null);
    verify = sinon.stub().resolves({ events: [event] });
    createEventProcessor = sinon.stub().returns({ processBatch, aggregate });
    service = new EmailEventService({
      provider: { source: 'provider', getEventSource: () => ({ type: 'webhook', verify }) },
      createEventProcessor,
    });
  });
  afterEach(() => sinon.restore());

  it('delegates unchanged IDs and aggregates through the family processor', async () => {
    await service.webhook('provider', request);
    sinon.assert.calledOnceWithExactly(createEventProcessor, 'newsletters');
    assert.deepEqual(processBatch.firstCall.firstArg, [event]);
    assert.equal(aggregate.firstCall.firstArg.processingResult.delivered, 1);
    assert.equal(clock.countTimers(), 0);
  });
  it('retries only unmatched events once after 500 ms', async () => {
    const late = { ...event, id: 'late' };
    verify.resolves({ events: [event, late] });
    processBatch.onSecondCall().callsFake(missing);
    const pending = service.webhook('provider', request);
    await clock.tickAsync(499);
    sinon.assert.calledTwice(processBatch);
    await clock.tickAsync(1);
    await pending;
    sinon.assert.calledThrice(processBatch);
    assert.deepEqual(processBatch.thirdCall.firstArg, [late]);
    sinon.assert.calledOnce(verify);
    sinon.assert.calledOnce(aggregate);
    assert.equal(clock.countTimers(), 0);
  });
  it('returns 503 after a second missing result and still aggregates completed work', async () => {
    processBatch.callsFake(missing);
    const rejected = assert.rejects(service.webhook('provider', request), {
      code: 'EMAIL_RECIPIENT_NOT_FOUND',
      statusCode: 503,
    });
    await clock.tickAsync(500);
    await rejected;
    await clock.tickAsync(5000);
    sinon.assert.calledTwice(processBatch);
    sinon.assert.calledOnce(aggregate);
    assert.equal(clock.countTimers(), 0);
  });
  it('does not retry processing errors', async () => {
    const error = new Error('Database unavailable');
    processBatch.rejects(error);
    await assert.rejects(service.webhook('provider', request), error);
    sinon.assert.calledOnce(processBatch);
    assert.equal(clock.countTimers(), 0);
  });
  it('does not process unverified or partly invalid notifications', async () => {
    verify.rejects(new Error('Invalid signature'));
    await assert.rejects(service.webhook('provider', request), /Invalid signature/);
    verify.resolves({ events: [event, { ...event, id: '' }] });
    await assert.rejects(service.webhook('provider', request));
    sinon.assert.notCalled(createEventProcessor);
  });
  it('rejects an inactive source before verification', async () => {
    await assert.rejects(service.webhook('unknown', request), /source was not found/);
    sinon.assert.notCalled(verify);
  });
  it('validates the polling family before processing', () => {
    assert.throws(() => parseEmailEvents([event], 'automations'), /wrong family/);
    assert.deepEqual(parseEmailEvents([event], 'newsletters'), [event]);
  });
  it('keeps the webhook pending until aggregates finish', async () => {
    let complete!: () => void;
    aggregate.callsFake(
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
  it('uses a separate processor for each family and request', async () => {
    verify.resolves({
      events: [event, { ...event, family: 'automations' }, { ...event, family: 'gifts' }],
    });
    await service.webhook('provider', request);
    assert.deepEqual(createEventProcessor.args, [['newsletters'], ['automations'], ['gifts']]);
    await service.webhook('provider', request);
    assert.equal(createEventProcessor.callCount, 6);
  });
});
