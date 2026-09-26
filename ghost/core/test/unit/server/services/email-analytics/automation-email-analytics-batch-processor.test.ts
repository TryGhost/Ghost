import assert from 'node:assert/strict';

import sinon from 'sinon';
import logging from '@tryghost/logging';

import { AutomationEmailAnalyticsBatchProcessor } from '../../../../../core/server/services/email-analytics/automation-email-analytics-batch-processor';
import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';
import type { AutomatedEmailRecipientWithMailgunId } from '../../../../../core/server/services/automations/automations-repository';

function buildRecipient(
  overrides: Partial<AutomatedEmailRecipientWithMailgunId> = {},
): AutomatedEmailRecipientWithMailgunId {
  return {
    id: 'recipient-1',
    member_id: 'member-1',
    member_email: 'reader@example.com',
    mailgun_message_id: 'message-1',
    automation_action_revision_id: 'revision-1',
    ...overrides,
  };
}

function buildAutomationsApi(recipients: AutomatedEmailRecipientWithMailgunId[] = []) {
  return {
    getAutomatedEmailRecipientsByMailgunIds: sinon.stub().resolves(recipients),
    trackEmailDeliveredAndOpened: sinon.stub().resolves(),
  };
}

function safetyDeps() {
  return {
    emailSuppressionList: {
      handleBounce: sinon.stub().resolves(),
      handleComplaint: sinon.stub().resolves(),
      removeComplaint: sinon.stub().resolves(),
      removeUnsubscribe: sinon.stub().resolves(),
    },
    membersRepository: { unsubscribeFromUpdates: sinon.stub().resolves() },
  };
}

describe('AutomationEmailAnalyticsBatchProcessor', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('processBatch', function () {
    it('handles delivered', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
        ],
        result,
        fetchData,
      );

      assert.deepEqual(result, new EventProcessingResult({ delivered: 1 }));
      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(1) });

      sinon.assert.calledOnceWithExactly(automationsApi.getAutomatedEmailRecipientsByMailgunIds, [
        'message-1',
      ]);
      sinon.assert.calledOnceWithExactly(
        automationsApi.trackEmailDeliveredAndOpened,
        new Map([
          ['recipient-1', { deliveredAt: new Date(1), automationActionRevisionId: 'revision-1' }],
        ]),
      );
    });

    it('handles opened', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch(
        [
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
        ],
        result,
        fetchData,
      );

      assert.deepEqual(result, new EventProcessingResult({ opened: 1 }));
      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(1) });

      sinon.assert.calledOnceWithExactly(
        automationsApi.trackEmailDeliveredAndOpened,
        new Map([
          ['recipient-1', { openedAt: new Date(1), automationActionRevisionId: 'revision-1' }],
        ]),
      );
    });

    it('handles a mix of events for several recipients', async function () {
      const automationsApi = buildAutomationsApi([
        buildRecipient({ id: 'recipient-1', mailgun_message_id: 'message-1' }),
        buildRecipient({
          id: 'recipient-2',
          mailgun_message_id: 'message-2',
          automation_action_revision_id: 'revision-2',
        }),
      ]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
          {
            type: 'delivered',
            providerId: 'message-2',
            timestamp: new Date(2),
          },
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(3),
          },
        ],
        result,
        fetchData,
      );

      assert.deepEqual(result, new EventProcessingResult({ delivered: 2, opened: 1 }));
      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(3) });

      sinon.assert.calledOnceWithExactly(
        automationsApi.trackEmailDeliveredAndOpened,
        new Map([
          [
            'recipient-1',
            {
              deliveredAt: new Date(1),
              openedAt: new Date(3),
              automationActionRevisionId: 'revision-1',
            },
          ],
          ['recipient-2', { deliveredAt: new Date(2), automationActionRevisionId: 'revision-2' }],
        ]),
      );
    });

    it('reports each opening recipient with its revision', async function () {
      const automationsApi = buildAutomationsApi([
        buildRecipient({
          id: 'recipient-1',
          mailgun_message_id: 'message-1',
          automation_action_revision_id: 'revision-1',
        }),
        buildRecipient({
          id: 'recipient-2',
          mailgun_message_id: 'message-2',
          automation_action_revision_id: 'revision-1',
        }),
        buildRecipient({
          id: 'recipient-3',
          mailgun_message_id: 'message-3',
          automation_action_revision_id: 'revision-2',
        }),
      ]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });

      await processor.processBatch(
        [
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
          {
            type: 'opened',
            providerId: 'message-2',
            timestamp: new Date(2),
          },
          {
            type: 'opened',
            providerId: 'message-3',
            timestamp: new Date(3),
          },
        ],
        new EventProcessingResult(),
        {},
      );

      const tracked = automationsApi.trackEmailDeliveredAndOpened.firstCall.args[0];
      assert.deepEqual(
        tracked,
        new Map([
          ['recipient-1', { openedAt: new Date(1), automationActionRevisionId: 'revision-1' }],
          ['recipient-2', { openedAt: new Date(2), automationActionRevisionId: 'revision-1' }],
          ['recipient-3', { openedAt: new Date(3), automationActionRevisionId: 'revision-2' }],
        ]),
      );
    });

    it('keeps the earliest timestamp when a recipient has several events of the same type', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(3),
          },
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(4),
          },
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(2),
          },
        ],
        new EventProcessingResult(),
        {},
      );

      sinon.assert.calledOnceWithExactly(
        automationsApi.trackEmailDeliveredAndOpened,
        // A recipient that opens repeatedly is still one opener, reported
        // once at its earliest open.
        new Map([
          [
            'recipient-1',
            {
              deliveredAt: new Date(1),
              openedAt: new Date(2),
              automationActionRevisionId: 'revision-1',
            },
          ],
        ]),
      );
    });

    it('preserves opaque provider ids when looking recipients up', async function () {
      const automationsApi = buildAutomationsApi([
        buildRecipient({ mailgun_message_id: '  <message-1>  ' }),
      ]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: '  <message-1>  ',
            timestamp: new Date(1),
          },
        ],
        result,
        {},
      );

      sinon.assert.calledOnceWithExactly(automationsApi.getAutomatedEmailRecipientsByMailgunIds, [
        '  <message-1>  ',
      ]);
      assert.deepEqual(result, new EventProcessingResult({ delivered: 1 }));
    });

    it('deduplicates provider ids before looking recipients up', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(2),
          },
        ],
        new EventProcessingResult(),
        {},
      );

      sinon.assert.calledOnceWithExactly(automationsApi.getAutomatedEmailRecipientsByMailgunIds, [
        'message-1',
      ]);
    });

    it('counts events with no matching recipient as unprocessable', async function () {
      const automationsApi = buildAutomationsApi([]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'unknown-message',
            timestamp: new Date(1),
          },
          {
            type: 'opened',
            providerId: 'unknown-message',
            timestamp: new Date(2),
          },
        ],
        result,
        {},
      );

      assert.deepEqual(result, new EventProcessingResult({ unprocessable: 2 }));
      sinon.assert.calledOnceWithExactly(automationsApi.trackEmailDeliveredAndOpened, new Map());
    });

    it(`doesn't handle other event types`, async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch(
        [
          {
            // @ts-expect-error Exercise the runtime fallback for an unsupported event.
            type: 'notstandard',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
        ],
        result,
        fetchData,
      );

      assert.deepEqual(result, new EventProcessingResult({ unhandled: 1 }));
      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(1) });
      sinon.assert.calledOnceWithExactly(automationsApi.trackEmailDeliveredAndOpened, new Map());
    });

    it('merges into an existing result rather than replacing it', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult({ delivered: 2, opened: 1 });

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
        ],
        result,
        {},
      );

      assert.deepEqual(result, new EventProcessingResult({ delivered: 3, opened: 1 }));
    });

    it('advances lastEventTimestamp to the latest event', async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const fetchData = { lastEventTimestamp: new Date(2) };

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(5),
          },
          {
            type: 'opened',
            providerId: 'message-1',
            timestamp: new Date(3),
          },
        ],
        new EventProcessingResult(),
        fetchData,
      );

      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(5) });
    });

    it(`doesn't move lastEventTimestamp backwards`, async function () {
      const automationsApi = buildAutomationsApi([buildRecipient()]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const fetchData = { lastEventTimestamp: new Date(10) };

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
        ],
        new EventProcessingResult(),
        fetchData,
      );

      assert.deepEqual(fetchData, { lastEventTimestamp: new Date(10) });
    });

    it('handles an empty batch', async function () {
      const automationsApi = buildAutomationsApi([]);
      const processor = new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        ...safetyDeps(),
      });
      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch([], result, fetchData);

      assert.deepEqual(result, new EventProcessingResult());
      assert.deepEqual(fetchData, {});
      sinon.assert.notCalled(automationsApi.getAutomatedEmailRecipientsByMailgunIds);
      sinon.assert.calledOnce(automationsApi.trackEmailDeliveredAndOpened);
    });
  });
});

describe('automation safety events', () => {
  afterEach(() => sinon.restore());
  const event = {
    providerId: 'message-1',
    recipientEmail: 'reader@example.com',
    timestamp: new Date(),
    suppress: false,
  };
  it('handles complaints and failures without suppressing temporary failures', async () => {
    const deps = safetyDeps();
    const processor = new AutomationEmailAnalyticsBatchProcessor({
      automationsApi: buildAutomationsApi([buildRecipient()]),
      ...deps,
    });
    const result = new EventProcessingResult();
    const callback = { ...event, recipientEmail: event.recipientEmail.toUpperCase() };
    await processor.processBatch(
      [
        { ...callback, type: 'complained' },
        { ...callback, type: 'failed', severity: 'permanent', suppress: true },
        { ...callback, type: 'failed', severity: 'temporary' },
      ],
      result,
      {},
    );
    sinon.assert.calledOnceWithMatch(deps.emailSuppressionList.handleComplaint, {
      email: event.recipientEmail,
    });
    sinon.assert.calledOnceWithMatch(deps.emailSuppressionList.handleBounce, {
      email: event.recipientEmail,
      suppress: true,
    });
    sinon.assert.callOrder(
      deps.emailSuppressionList.handleComplaint,
      deps.emailSuppressionList.removeComplaint,
    );
    assert.equal(result.complained, 1);
    assert.equal(result.permanentFailed, 1);
    assert.equal(result.temporaryFailed, 1);
    deps.emailSuppressionList.handleComplaint.rejects(new Error('local failure'));
    await assert.rejects(
      processor.processBatch([{ ...event, type: 'complained' }], result, {}),
      /local failure/,
    );
    sinon.assert.calledOnce(deps.emailSuppressionList.removeComplaint);
  });
  it('propagates unsubscribe failure before cleanup and retries it on redelivery', async () => {
    const deps = safetyDeps();
    const processor = new AutomationEmailAnalyticsBatchProcessor({
      automationsApi: buildAutomationsApi([buildRecipient()]),
      ...deps,
    });
    deps.membersRepository.unsubscribeFromUpdates.rejects(new Error('local failure'));
    const result = new EventProcessingResult();
    const callback = {
      ...event,
      type: 'unsubscribed' as const,
      recipientEmail: event.recipientEmail.toUpperCase(),
    };
    await assert.rejects(processor.processBatch([callback], result, {}), /local failure/);
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe);
    assert.equal(result.unsubscribed, 0);
    deps.membersRepository.unsubscribeFromUpdates.resolves();
    await processor.processBatch([callback], result, {});
    sinon.assert.calledWithExactly(deps.membersRepository.unsubscribeFromUpdates, {
      id: 'member-1',
      email: event.recipientEmail,
    });
    sinon.assert.calledWithExactly(deps.membersRepository.unsubscribeFromUpdates, {
      id: 'member-1',
      email: event.recipientEmail,
    });
    sinon.assert.calledOnceWithExactly(
      deps.emailSuppressionList.removeUnsubscribe,
      event.recipientEmail,
      { requireSuccess: true },
    );
    assert.equal(result.unsubscribed, 1);
  });
  it('saves earlier delivery and open tracking when a later safety write fails', async () => {
    const deps = safetyDeps();
    const automationsApi = buildAutomationsApi([buildRecipient()]);
    const processor = new AutomationEmailAnalyticsBatchProcessor({ automationsApi, ...deps });
    const failure = new Error('preference write failed');
    const flushFailure = new Error('tracking write failed');
    const log = sinon.stub(logging, 'error');
    deps.membersRepository.unsubscribeFromUpdates.rejects(failure);
    const events = [
      { ...event, type: 'delivered' as const },
      { ...event, type: 'opened' as const },
      { ...event, type: 'unsubscribed' as const },
      { ...event, type: 'complained' as const },
    ];
    const result = new EventProcessingResult();
    await assert.rejects(processor.processBatch(events, result, {}), (error) => error === failure);
    sinon.assert.calledOnceWithExactly(
      automationsApi.trackEmailDeliveredAndOpened,
      new Map([
        [
          'recipient-1',
          {
            automationActionRevisionId: 'revision-1',
            deliveredAt: event.timestamp,
            openedAt: event.timestamp,
          },
        ],
      ]),
    );
    assert.equal(result.delivered, 1);
    assert.equal(result.opened, 1);
    assert.equal(result.unsubscribed, 0);
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe);
    sinon.assert.notCalled(deps.emailSuppressionList.handleComplaint);

    // A secondary flush failure must not hide the safety failure or acknowledge it.
    automationsApi.trackEmailDeliveredAndOpened.rejects(flushFailure);
    await assert.rejects(
      processor.processBatch(events, new EventProcessingResult(), {}),
      (error) => error === failure,
    );
    sinon.assert.calledOnceWithExactly(log, flushFailure);
    automationsApi.trackEmailDeliveredAndOpened.resolves();
    deps.membersRepository.unsubscribeFromUpdates.resolves();
    const retried = new EventProcessingResult();
    await processor.processBatch(events, retried, {});
    assert.equal(retried.unsubscribed, 1);
    assert.equal(retried.complained, 1);
  });

  it('does not apply safety events to another recipient address', async () => {
    const deps = safetyDeps();
    const processor = new AutomationEmailAnalyticsBatchProcessor({
      automationsApi: buildAutomationsApi([buildRecipient()]),
      ...deps,
    });
    const result = new EventProcessingResult();
    await processor.processBatch(
      [{ ...event, type: 'complained', recipientEmail: 'other@example.com' }],
      result,
      {},
    );
    sinon.assert.notCalled(deps.emailSuppressionList.handleComplaint);
    assert.equal(result.unprocessable, 1);
  });
  it('keeps polling cleanup best-effort and handles deleted members', async () => {
    const deps = safetyDeps();
    const processor = new AutomationEmailAnalyticsBatchProcessor({
      automationsApi: buildAutomationsApi([buildRecipient({ member_id: null })]),
      ...deps,
      requireProviderCleanup: false,
    });
    await processor.processBatch(
      [{ ...event, type: 'unsubscribed' }],
      new EventProcessingResult(),
      {},
    );
    sinon.assert.notCalled(deps.membersRepository.unsubscribeFromUpdates);
    sinon.assert.calledOnceWithExactly(
      deps.emailSuppressionList.removeUnsubscribe,
      event.recipientEmail,
      { requireSuccess: false },
    );
  });
});
