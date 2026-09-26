import type { EmailEvent } from '@tryghost/adapter-base-email';
// @ts-expect-error This module lacks type definitions.
import type EmailSuppressionList from '../email-suppression-list';
import type membersService from '../members';
import type * as automationsApi from '../automations/automations-api';
import type {
  AutomatedEmailEvents,
  AutomatedEmailRecipientWithMailgunId,
} from '../automations/automations-repository';
import type { BatchEventProcessor } from './batch-event-processor';
import { EventProcessingResult } from './event-processing-result';

type AutomationsApi = {
  getAutomatedEmailRecipientsByMailgunIds: typeof automationsApi.getAutomatedEmailRecipientsByMailgunIds;
  trackEmailDeliveredAndOpened: typeof automationsApi.trackEmailDeliveredAndOpened;
};

type EmailAnalyticsEvent = {
  type: string;
  providerId: string;
  timestamp: Date;
  recipientEmail?: string;
  severity?: EmailEvent['severity'];
  suppress?: boolean;
};

const getMailgunMessageIds = (events: Iterable<EmailAnalyticsEvent>): Set<string> => {
  const result = new Set<string>();
  for (const { providerId } of events) {
    result.add(providerId);
  }
  return result;
};

const getAutomatedEmailRecipients = async (
  automationsApi: AutomationsApi,
  mailgunMessageIds: Set<string>,
): Promise<AutomatedEmailRecipientWithMailgunId[]> =>
  mailgunMessageIds.size
    ? await automationsApi.getAutomatedEmailRecipientsByMailgunIds(Array.from(mailgunMessageIds))
    : [];

const getAutomatedEmailRecipientsByMessageId = (
  automatedEmailRecipients: Iterable<AutomatedEmailRecipientWithMailgunId>,
): Map<string, AutomatedEmailRecipientWithMailgunId> => {
  const result = new Map<string, AutomatedEmailRecipientWithMailgunId>();
  for (const automatedEmailRecipient of automatedEmailRecipients) {
    result.set(automatedEmailRecipient.mailgun_message_id, automatedEmailRecipient);
  }
  return result;
};

const trackEarliest = (
  map: Map<string, AutomatedEmailEvents>,
  recipient: AutomatedEmailRecipientWithMailgunId,
  field: 'deliveredAt' | 'openedAt',
  timestamp: Date,
): void => {
  const events = map.get(recipient.id) ?? {
    automationActionRevisionId: recipient.automation_action_revision_id,
  };
  const existing = events[field];
  if (!existing || timestamp < existing) {
    events[field] = timestamp;
  }
  map.set(recipient.id, events);
};

export class AutomationEmailAnalyticsBatchProcessor implements BatchEventProcessor {
  private readonly deps: {
    automationsApi: AutomationsApi;
    emailSuppressionList: Pick<
      typeof EmailSuppressionList,
      'handleBounce' | 'handleComplaint' | 'removeComplaint' | 'removeUnsubscribe'
    >;
    membersRepository: Pick<typeof membersService.api.members, 'unsubscribeFromUpdates'>;
    requireProviderCleanup?: boolean;
  };

  constructor(deps: AutomationEmailAnalyticsBatchProcessor['deps']) {
    this.deps = deps;
  }

  async processBatch(
    events: ReadonlyArray<EmailAnalyticsEvent>,
    result: EventProcessingResult,
    fetchData: { lastEventTimestamp?: Date },
  ): Promise<void> {
    const mailgunMessageIds = getMailgunMessageIds(events);

    const automatedEmailRecipients = await getAutomatedEmailRecipients(
      this.deps.automationsApi,
      mailgunMessageIds,
    );
    const automatedEmailRecipientsByMessageId =
      getAutomatedEmailRecipientsByMessageId(automatedEmailRecipients);

    const eventsByAutomatedEmailRecipientId = new Map<string, AutomatedEmailEvents>();

    for (const event of events) {
      if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
        fetchData.lastEventTimestamp = event.timestamp;
      }

      let eventResult: EventProcessingResult;

      const getRecipient = () => {
        const mailgunMessageId = event.providerId;
        return automatedEmailRecipientsByMessageId.get(mailgunMessageId);
      };

      switch (event.type) {
        case 'delivered': {
          const recipient = getRecipient();
          if (recipient) {
            trackEarliest(
              eventsByAutomatedEmailRecipientId,
              recipient,
              'deliveredAt',
              event.timestamp,
            );
            eventResult = new EventProcessingResult({ delivered: 1 });
          } else {
            eventResult = new EventProcessingResult({ unprocessable: 1 });
          }
          break;
        }
        case 'opened': {
          const recipient = getRecipient();
          if (recipient) {
            trackEarliest(
              eventsByAutomatedEmailRecipientId,
              recipient,
              'openedAt',
              event.timestamp,
            );
            eventResult = new EventProcessingResult({ opened: 1 });
          } else {
            eventResult = new EventProcessingResult({ unprocessable: 1 });
          }
          break;
        }
        case 'failed':
        case 'complained':
        case 'unsubscribed': {
          const recipient = getRecipient();
          // Safety and preference changes must match the original recipient address.
          if (
            !recipient ||
            !event.recipientEmail ||
            recipient.member_email !== event.recipientEmail
          ) {
            eventResult = new EventProcessingResult({ unprocessable: 1 });
            break;
          }
          const suppressionEvent = {
            email: event.recipientEmail,
            timestamp: event.timestamp,
            suppress: event.suppress ?? false,
          };
          const cleanupOptions = { requireSuccess: this.deps.requireProviderCleanup ?? true };
          if (event.type === 'complained') {
            await this.deps.emailSuppressionList.handleComplaint(suppressionEvent);
            await this.deps.emailSuppressionList.removeComplaint(
              event.recipientEmail,
              cleanupOptions,
            );
            eventResult = new EventProcessingResult({ complained: 1 });
          } else if (event.type === 'unsubscribed') {
            if (recipient.member_id) {
              await this.deps.membersRepository.unsubscribeFromUpdates({
                id: recipient.member_id,
                email: event.recipientEmail,
              });
            }
            await this.deps.emailSuppressionList.removeUnsubscribe(
              event.recipientEmail,
              cleanupOptions,
            );
            eventResult = new EventProcessingResult({ unsubscribed: 1 });
          } else {
            if (event.severity === 'permanent') {
              await this.deps.emailSuppressionList.handleBounce(suppressionEvent);
            }
            eventResult = new EventProcessingResult(
              event.severity === 'permanent' ? { permanentFailed: 1 } : { temporaryFailed: 1 },
            );
          }
          break;
        }
        default:
          eventResult = new EventProcessingResult({ unhandled: 1 });
          break;
      }

      result.merge(eventResult);
    }

    await this.deps.automationsApi.trackEmailDeliveredAndOpened(eventsByAutomatedEmailRecipientId);
  }
}
