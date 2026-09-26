import type { EmailEvent } from '@tryghost/adapter-base-email';
import logging from '@tryghost/logging';
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
import { processEvent } from './process-event';

type AutomationsApi = {
  getAutomatedEmailRecipientsByMailgunIds: typeof automationsApi.getAutomatedEmailRecipientsByMailgunIds;
  trackEmailDeliveredAndOpened: typeof automationsApi.trackEmailDeliveredAndOpened;
};

type EmailAnalyticsEvent = Pick<EmailEvent, 'type' | 'providerId' | 'timestamp'> &
  Partial<Pick<EmailEvent, 'id' | 'recipientEmail' | 'severity' | 'suppress'>>;

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
      'handleBounce' | 'handleComplaint' | 'removeComplaint'
    >;
    membersRepository: Pick<typeof membersService.api.members, 'unsubscribeFromUpdates'>;
    requireProviderCleanup?: boolean;
    skipFailedEvents?: boolean;
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

    try {
      for (const event of events) {
        if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
          fetchData.lastEventTimestamp = event.timestamp;
        }

        const processedEvent = await processEvent(
          async () => {
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
                const recipientEmail = recipient?.member_email;
                // Safety and preference changes must match the original recipient address.
                if (
                  !recipient ||
                  !recipientEmail ||
                  !event.recipientEmail ||
                  recipientEmail.toLowerCase() !== event.recipientEmail.toLowerCase()
                ) {
                  eventResult = new EventProcessingResult({ unprocessable: 1 });
                  break;
                }
                const suppressionEvent = {
                  email: recipientEmail,
                  timestamp: event.timestamp,
                  suppress: event.suppress ?? false,
                };
                const cleanupOptions = { requireSuccess: this.deps.requireProviderCleanup ?? true };
                if (event.type === 'complained') {
                  await this.deps.emailSuppressionList.handleComplaint(suppressionEvent);
                  await this.deps.emailSuppressionList.removeComplaint(
                    recipientEmail,
                    cleanupOptions,
                  );
                  eventResult = new EventProcessingResult({ complained: 1 });
                } else if (event.type === 'unsubscribed') {
                  if (recipient.member_id) {
                    await this.deps.membersRepository.unsubscribeFromUpdates({
                      id: recipient.member_id,
                      email: recipientEmail,
                    });
                  }
                  // Provider unsubscribes may cover shared tags or the whole domain.
                  // Updating this automation preference must not lift that protection.
                  eventResult = new EventProcessingResult({ unsubscribed: 1 });
                } else {
                  if (event.severity === 'permanent') {
                    await this.deps.emailSuppressionList.handleBounce(suppressionEvent);
                  }
                  eventResult = new EventProcessingResult(
                    event.severity === 'permanent'
                      ? { permanentFailed: 1 }
                      : { temporaryFailed: 1 },
                  );
                }
                break;
              }
              default:
                eventResult = new EventProcessingResult({ unhandled: 1 });
                break;
            }

            return eventResult;
          },
          { skipFailedEvents: this.deps.skipFailedEvents, eventId: event.id },
        );
        result.merge(processedEvent);
      }
    } catch (err) {
      // Preserve completed delivery/open updates before retrying the failed event.
      await this.deps.automationsApi
        .trackEmailDeliveredAndOpened(eventsByAutomatedEmailRecipientId)
        .catch((flushError) => logging.error(flushError));
      throw err;
    }

    await this.deps.automationsApi.trackEmailDeliveredAndOpened(eventsByAutomatedEmailRecipientId);
  }
}
