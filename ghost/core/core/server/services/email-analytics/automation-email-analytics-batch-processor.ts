import {normalizeMailgunMessageId} from '../automations/mailgun-message-id';
import type * as automationsApi from '../automations/automations-api';
import type {AutomatedEmailEvents, AutomatedEmailRecipientWithMailgunId} from '../automations/automations-repository';
import type {BatchEventProcessor} from './batch-event-processor';
import {EventProcessingResult} from './event-processing-result';

type AutomationsApi = {
    getAutomatedEmailRecipientsByMailgunIds: typeof automationsApi.getAutomatedEmailRecipientsByMailgunIds;
    trackEmailDeliveredAndOpened: typeof automationsApi.trackEmailDeliveredAndOpened;
};

type EmailAnalyticsEvent = {
    type: string;
    providerId: string;
    timestamp: Date;
};

const getMailgunMessageIds = (events: Iterable<EmailAnalyticsEvent>): Set<string> => {
    const result = new Set<string>();
    for (const {providerId} of events) {
        result.add(normalizeMailgunMessageId(providerId));
    }
    return result;
};

const getAutomatedEmailRecipients = async (
    automationsApi: AutomationsApi,
    mailgunMessageIds: Set<string>
): Promise<AutomatedEmailRecipientWithMailgunId[]> => (
    mailgunMessageIds.size
        ? await automationsApi.getAutomatedEmailRecipientsByMailgunIds(Array.from(mailgunMessageIds))
        : []
);

const getAutomatedEmailRecipientsByMessageId = (
    automatedEmailRecipients: Iterable<AutomatedEmailRecipientWithMailgunId>
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
    timestamp: Date
): void => {
    const events = map.get(recipient.id) ?? {
        automationActionRevisionId: recipient.automation_action_revision_id
    };
    const existing = events[field];
    if (!existing || timestamp < existing) {
        events[field] = timestamp;
    }
    map.set(recipient.id, events);
};

export class AutomationEmailAnalyticsBatchProcessor implements BatchEventProcessor {
    #automationsApi;

    constructor({
        automationsApi
    }: {
        automationsApi: AutomationsApi
    }) {
        this.#automationsApi = automationsApi;
    }

    async processBatch(
        events: ReadonlyArray<EmailAnalyticsEvent>,
        result: EventProcessingResult,
        fetchData: {lastEventTimestamp?: Date}
    ): Promise<void> {
        const mailgunMessageIds = getMailgunMessageIds(events);

        const automatedEmailRecipients = await getAutomatedEmailRecipients(
            this.#automationsApi,
            mailgunMessageIds
        );
        const automatedEmailRecipientsByMessageId = getAutomatedEmailRecipientsByMessageId(automatedEmailRecipients);

        const eventsByAutomatedEmailRecipientId = new Map<string, AutomatedEmailEvents>();

        for (const event of events) {
            if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
                fetchData.lastEventTimestamp = event.timestamp;
            }

            let eventResult: EventProcessingResult;

            const getRecipient = () => {
                const mailgunMessageId = normalizeMailgunMessageId(event.providerId);
                return automatedEmailRecipientsByMessageId.get(mailgunMessageId);
            };

            switch (event.type) {
            case 'delivered': {
                const recipient = getRecipient();
                if (recipient) {
                    trackEarliest(eventsByAutomatedEmailRecipientId, recipient, 'deliveredAt', event.timestamp);
                    eventResult = new EventProcessingResult({delivered: 1});
                } else {
                    eventResult = new EventProcessingResult({unprocessable: 1});
                }
                break;
            }
            case 'opened': {
                const recipient = getRecipient();
                if (recipient) {
                    trackEarliest(eventsByAutomatedEmailRecipientId, recipient, 'openedAt', event.timestamp);
                    eventResult = new EventProcessingResult({opened: 1});
                } else {
                    eventResult = new EventProcessingResult({unprocessable: 1});
                }
                break;
            }
            default:
                eventResult = new EventProcessingResult({unhandled: 1});
                break;
            }

            result.merge(eventResult);
        }

        await this.#automationsApi.trackEmailDeliveredAndOpened(eventsByAutomatedEmailRecipientId);
    }
}
