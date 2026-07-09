import moment from 'moment-timezone';
import {normalizeMailgunMessageId} from '../automations/mailgun-message-id';
import type * as AutomationsApi from '../automations/automations-api';
import type {AutomatedEmailRecipient} from '../automations/automations-repository';
import * as errors from '@tryghost/errors';
import {EventProcessingResult} from './event-processing-result';

const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

type EmailAnalyticsEvent = {
    type: string;
    providerId?: string | null;
    timestamp: Date;
};

type ProcessingResult = {
    merge(other: InstanceType<typeof EventProcessingResult>): void;
};

type FetchData = {
    lastEventTimestamp?: Date;
};

type AutomationEmailAnalyticsApi = Pick<
    typeof AutomationsApi,
    'getAutomatedEmailRecipientsByMailgunIds' | 'updateAutomatedEmailRecipientsTimestamps'
>;

export type AutomationEmailAnalyticsProcessor = {
    processEventBatch(events: EmailAnalyticsEvent[], result: ProcessingResult, fetchData: FetchData): Promise<void>;
};

function keepEarliest(map: Map<string, string>, id: string, timestamp: Date): void {
    const formattedTimestamp = moment.utc(timestamp).format(DATABASE_DATE_FORMAT);
    const existing = map.get(id);

    if (!existing || formattedTimestamp < existing) {
        map.set(id, formattedTimestamp);
    }
}

export function createAutomationEmailAnalyticsProcessor({
    automationsApi
}: {
    automationsApi: AutomationEmailAnalyticsApi;
}): AutomationEmailAnalyticsProcessor {
    return {
        async processEventBatch(events, result, fetchData) {
            const mailgunMessageIds = new Set(events.flatMap((event) => {
                if (typeof event.providerId !== 'string' || !event.providerId) {
                    return [];
                }
                return [normalizeMailgunMessageId(event.providerId)];
            }));

            const recipients = mailgunMessageIds.size > 0
                ? await automationsApi.getAutomatedEmailRecipientsByMailgunIds(Array.from(mailgunMessageIds))
                : [];

            const recipientsByMessageId = new Map<string, AutomatedEmailRecipient>();
            for (const recipient of recipients) {
                const mailgunMessageId = recipient.mailgun_message_id;
                if (!mailgunMessageId) {
                    throw new errors.InternalServerError({
                        message: "Recipient should have had a Mailgun message ID but didn't"
                    });
                }
                recipientsByMessageId.set(mailgunMessageId, recipient);
            }

            const deliveredUpdates = new Map<string, string>();
            const openedUpdates = new Map<string, string>();

            for (const event of events) {
                if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
                    fetchData.lastEventTimestamp = event.timestamp;
                }

                if (event.type !== 'delivered' && event.type !== 'opened') {
                    result.merge(new EventProcessingResult({unhandled: 1}));
                    continue;
                }

                const mailgunMessageId = event.providerId ? normalizeMailgunMessageId(event.providerId) : null;
                const recipient = mailgunMessageId ? recipientsByMessageId.get(mailgunMessageId) : null;
                if (!recipient) {
                    result.merge(new EventProcessingResult({unprocessable: 1}));
                    continue;
                }

                switch (event.type) {
                case 'delivered':
                    keepEarliest(deliveredUpdates, recipient.id, event.timestamp);
                    result.merge(new EventProcessingResult({delivered: 1}));
                    break;
                case 'opened':
                    keepEarliest(openedUpdates, recipient.id, event.timestamp);
                    result.merge(new EventProcessingResult({opened: 1}));
                    break;
                default: {
                    const _exhaustive: never = event.type;
                    throw new errors.InternalServerError({
                        message: `Unexpected event type ${_exhaustive}`
                    });
                }
                }
            }

            await automationsApi.updateAutomatedEmailRecipientsTimestamps({
                delivered: deliveredUpdates,
                opened: openedUpdates
            });
        }
    };
}
