import assert from 'node:assert/strict';

import sinon from 'sinon';

import { AutomationEmailAnalyticsBatchProcessor } from '../../../../../core/server/services/email-analytics/automation-email-analytics-batch-processor';
import { AutomationEmailOpenedEvent } from '../../../../../core/server/services/email-service/events/automation-email-opened-event';
import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';
import type { AutomatedEmailRecipientWithMailgunId } from '../../../../../core/server/services/automations/automations-repository';

function buildRecipient(
  overrides: Partial<AutomatedEmailRecipientWithMailgunId> = {},
): AutomatedEmailRecipientWithMailgunId {
  return {
    id: 'recipient-1',
    member_id: 'member-1',
    mailgun_message_id: 'message-1',
    automation_action_revision_id: 'revision-1',
    ...overrides,
  };
}

describe('AutomationEmailAnalyticsBatchProcessor', function () {
  const domainEvents = { dispatch: sinon.stub() };

  function buildProcessor(recipients: AutomatedEmailRecipientWithMailgunId[] = []) {
    const automationsApi = {
      getAutomatedEmailRecipientsByMailgunIds: sinon.stub().resolves(recipients),
      trackEmailDeliveredAndOpened: sinon.stub().resolves(),
    };
    const processor = new AutomationEmailAnalyticsBatchProcessor({ automationsApi, domainEvents });
    return { automationsApi, processor };
  }

  beforeEach(function () {
    domainEvents.dispatch.reset();
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('processBatch', function () {
    it('handles delivered', async function () {
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

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

      sinon.assert.notCalled(domainEvents.dispatch);
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
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

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

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        AutomationEmailOpenedEvent.create({
          memberId: 'member-1',
          emailRecipientId: 'recipient-1',
          timestamp: new Date(1),
        }),
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

    it('does not dispatch opens when storing analytics fails', async function () {
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);
      automationsApi.trackEmailDeliveredAndOpened.rejects(new Error('Storage failed'));

      await assert.rejects(
        processor.processBatch(
          [{ type: 'opened', providerId: 'message-1', timestamp: new Date(1) }],
          new EventProcessingResult(),
          {},
        ),
        /Storage failed/,
      );
      sinon.assert.notCalled(domainEvents.dispatch);
    });

    it('handles a mix of events for several recipients', async function () {
      const { automationsApi, processor } = buildProcessor([
        buildRecipient({ id: 'recipient-1', mailgun_message_id: 'message-1' }),
        buildRecipient({
          id: 'recipient-2',
          mailgun_message_id: 'message-2',
          automation_action_revision_id: 'revision-2',
        }),
      ]);

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
      const { automationsApi, processor } = buildProcessor([
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
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

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

      assert.deepEqual(
        domainEvents.dispatch.getCalls().map((call) => call.args[0].timestamp),
        [new Date(4), new Date(2)],
        'member activity should receive every open, including out-of-order events',
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

    it('normalizes provider ids before looking recipients up', async function () {
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

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
        'message-1',
      ]);
      assert.deepEqual(result, new EventProcessingResult({ delivered: 1 }));
    });

    it('deduplicates provider ids before looking recipients up', async function () {
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

      await processor.processBatch(
        [
          {
            type: 'delivered',
            providerId: 'message-1',
            timestamp: new Date(1),
          },
          {
            type: 'opened',
            providerId: '<message-1>',
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
      const { automationsApi, processor } = buildProcessor([]);

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

      sinon.assert.notCalled(domainEvents.dispatch);
      assert.deepEqual(result, new EventProcessingResult({ unprocessable: 2 }));
      sinon.assert.calledOnceWithExactly(automationsApi.trackEmailDeliveredAndOpened, new Map());
    });

    it(`doesn't handle other event types`, async function () {
      const { automationsApi, processor } = buildProcessor([buildRecipient()]);

      const result = new EventProcessingResult();
      const fetchData: { lastEventTimestamp?: Date } = {};

      await processor.processBatch(
        [
          {
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
      const { processor } = buildProcessor([buildRecipient()]);

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
      const { processor } = buildProcessor([buildRecipient()]);

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
      const { processor } = buildProcessor([buildRecipient()]);

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
      const { automationsApi, processor } = buildProcessor([]);

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
