import logging from '@tryghost/logging';
// @ts-expect-error This module lacks type definitions.
import type {MemberRepository} from '../members/members-api/repositories/member-repository';
import {EventProcessingResult} from './event-processing-result';
// @ts-expect-error This module lacks type definitions.
import EmailEventProcessor from '../email-service/email-event-processor';
// @ts-expect-error This module lacks type definitions.
import EmailEventStorage from '../email-service/email-event-storage';

// How often (or after how many pending members) we drain pending aggregations
// mid-fetch, so newly processed events become visible in the stats without
// waiting for the entire fetch to finish.
const AGGREGATE_INTERVAL_MS = 5 * 60 * 1000;
const MEMBER_AGGREGATION_THRESHOLD = 5000;

type AggregationTimings = {emailAggregationTimeMs: number, memberAggregationTimeMs: number};

type Config = {
    get(key: string): unknown;
};

type EmailAnalyticsEvent = {
    id?: string;
    type: string;
    severity?: unknown;
    recipientEmail?: string;
    emailId?: string | number;
    providerId?: string;
    timestamp: Date;
    error?: Record<string, unknown> | null;
};

type Recipient = {
    emailId: string | number;
    memberId: string | number;
};

type RecipientCache = Map<string, unknown>;
type RecipientHandler = (
    identification: {emailId?: string | number, providerId?: string, email?: string},
    eventData: Date | {id?: string, timestamp: Date, error?: Record<string, unknown> | null},
    recipientCache?: RecipientCache
) => Promise<Recipient | null> | Recipient | null;

type EventProcessor = {
    batchGetRecipients: (identifications: Array<{emailId?: string | number, providerId?: string, email?: string}>) => Promise<RecipientCache>;
    flushBatchedUpdates: () => Promise<void>;
    handleDelivered: RecipientHandler;
    handleOpened: RecipientHandler;
    handlePermanentFailed: RecipientHandler;
    handleTemporaryFailed: RecipientHandler;
    handleUnsubscribed: RecipientHandler;
    handleComplained: RecipientHandler;
};

type Queries = {
    aggregateEmailStats: (emailId: string, includeOpenedEvents?: boolean) => Promise<unknown> | unknown;
    aggregateMemberStats: (memberId: string) => Promise<unknown> | unknown;
    aggregateMemberStatsBatch: (memberIds: string[]) => Promise<unknown> | unknown;
};

type Metric = {
    inc(value?: number): void;
};

type PrometheusClient = {
    getMetric?(name: string): Metric | undefined;
    registerCounter(options: {name: string, help: string}): void;
};

type ProcessingResult = {
    merge(result: InstanceType<typeof EventProcessingResult>): void;
};

type FetchData = {
    lastEventTimestamp?: Date;
};

type Models = {
    Email: unknown;
    EmailRecipientFailure: unknown;
    EmailSpamComplaintEvent: unknown;
};

export class NewsletterEmailAnalyticsProcessor {
    config: Config;
    eventProcessor: EventProcessor;
    queries: Queries;
    prometheusClient?: PrometheusClient;
    public processEventBatch: (events: EmailAnalyticsEvent[], result: ProcessingResult, fetchData: FetchData) => Promise<void>;
    public aggregateStats: (
        stats: {emailIds?: string[], memberIds?: string[]},
        includeOpenedEvents?: boolean
    ) => Promise<AggregationTimings>;
    public flush: (options?: {includeOpenedEvents?: boolean, force?: boolean}) => Promise<AggregationTimings>;

    // IDs seen since the last aggregation, waiting to be rolled up into the
    // emails/members stat tables. Tracked here (rather than in the fetch loop)
    // because deciding when and what to aggregate is the newsletter pipeline's
    // concern, not the shared fetch engine's.
    #pendingEmailIds: Set<string> = new Set();
    #pendingMemberIds: Set<string> = new Set();
    #lastAggregation: number = Date.now();

    constructor({
        config,
        eventProcessor = {},
        queries = {},
        prometheusClient
    }: {
        config: Config,
        eventProcessor?: Partial<EventProcessor>,
        queries?: Partial<Queries>,
        prometheusClient?: PrometheusClient
    }) {
        this.config = config;
        this.eventProcessor = eventProcessor as EventProcessor;
        this.queries = queries as Queries;
        this.prometheusClient = prometheusClient;
        this.processEventBatch = this.#processEventBatch.bind(this);
        this.aggregateStats = this.#aggregateStats.bind(this);
        this.flush = this.#flush.bind(this);

        if (prometheusClient && !prometheusClient.getMetric?.('email_analytics_aggregate_member_stats_count')) {
            prometheusClient.registerCounter({name: 'email_analytics_aggregate_member_stats_count', help: 'Count of member stats aggregations'});
        }
    }

    async #processEventBatch(events: EmailAnalyticsEvent[], result: ProcessingResult, fetchData: FetchData): Promise<void> {
        const useBatchProcessing = this.config.get('emailAnalytics:batchProcessing');

        if (useBatchProcessing) {
            const emailIdentifications = events.map(event => ({
                emailId: event.emailId,
                providerId: event.providerId,
                email: event.recipientEmail
            }));

            const recipientCache = await this.eventProcessor.batchGetRecipients(emailIdentifications);

            for (const event of events) {
                const batchResult = await this.processEvent(event, recipientCache);

                if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
                    fetchData.lastEventTimestamp = event.timestamp;
                }

                result.merge(batchResult);
                this.#trackPending(batchResult);
            }

            await this.eventProcessor.flushBatchedUpdates();
        } else {
            for (const event of events) {
                const batchResult = await this.processEvent(event);

                if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
                    fetchData.lastEventTimestamp = event.timestamp;
                }

                result.merge(batchResult);
                this.#trackPending(batchResult);
            }
        }
    }

    #trackPending(batchResult: InstanceType<typeof EventProcessingResult>): void {
        for (const emailId of batchResult.emailIds) {
            this.#pendingEmailIds.add(emailId);
        }
        for (const memberId of batchResult.memberIds) {
            this.#pendingMemberIds.add(memberId);
        }
    }

    /**
     * Aggregate the events collected since the last flush. Called by the fetch
     * engine after each batch (force = false) and once when the fetch finishes
     * (force = true). Without force, we only aggregate once enough time has
     * passed or enough members have piled up — otherwise looping every member
     * on every batch would be too slow.
     */
    async #flush({includeOpenedEvents = true, force = false}: {includeOpenedEvents?: boolean, force?: boolean} = {}): Promise<AggregationTimings> {
        const intervalElapsed = Date.now() - this.#lastAggregation > AGGREGATE_INTERVAL_MS;
        const thresholdReached = this.#pendingMemberIds.size > MEMBER_AGGREGATION_THRESHOLD;

        if (!force && !intervalElapsed && !thresholdReached) {
            return {emailAggregationTimeMs: 0, memberAggregationTimeMs: 0};
        }

        const emailIds = Array.from(this.#pendingEmailIds);
        const memberIds = Array.from(this.#pendingMemberIds);
        this.#pendingEmailIds.clear();
        this.#pendingMemberIds.clear();
        this.#lastAggregation = Date.now();

        if (emailIds.length === 0 && memberIds.length === 0) {
            return {emailAggregationTimeMs: 0, memberAggregationTimeMs: 0};
        }

        return this.#aggregateStats({emailIds, memberIds}, includeOpenedEvents);
    }

    async processEvent(event: EmailAnalyticsEvent, recipientCache?: RecipientCache): Promise<InstanceType<typeof EventProcessingResult>> {
        const identification = {
            emailId: event.emailId,
            providerId: event.providerId,
            email: event.recipientEmail
        };

        if (event.type === 'delivered') {
            const recipient = await this.eventProcessor.handleDelivered(identification, event.timestamp, recipientCache);

            if (recipient) {
                return new EventProcessingResult({
                    delivered: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'opened') {
            const recipient = await this.eventProcessor.handleOpened(identification, event.timestamp, recipientCache);

            if (recipient) {
                return new EventProcessingResult({
                    opened: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'failed') {
            const failure = {id: event.id, timestamp: event.timestamp, error: event.error};
            if (event.severity === 'permanent') {
                const recipient = await this.eventProcessor.handlePermanentFailed(identification, failure, recipientCache);

                if (recipient) {
                    return new EventProcessingResult({
                        permanentFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            }

            const recipient = await this.eventProcessor.handleTemporaryFailed(identification, failure, recipientCache);

            if (recipient) {
                return new EventProcessingResult({
                    temporaryFailed: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'unsubscribed') {
            const recipient = await this.eventProcessor.handleUnsubscribed(identification, event.timestamp, recipientCache);

            if (recipient) {
                return new EventProcessingResult({
                    unsubscribed: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'complained') {
            const recipient = await this.eventProcessor.handleComplained(identification, event.timestamp, recipientCache);

            if (recipient) {
                return new EventProcessingResult({
                    complained: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        return new EventProcessingResult({unhandled: 1});
    }

    async #aggregateStats(
        {emailIds = [], memberIds = []}: {emailIds?: string[], memberIds?: string[]},
        includeOpenedEvents = true
    ): Promise<{emailAggregationTimeMs: number, memberAggregationTimeMs: number}> {
        const useBatchProcessing = this.config.get('emailAnalytics:batchProcessing');

        const emailAggregationStart = Date.now();
        for (const emailId of emailIds) {
            await this.aggregateEmailStats(emailId, includeOpenedEvents);
        }
        const emailAggregationTimeMs = Date.now() - emailAggregationStart;

        const memberMetric = this.prometheusClient?.getMetric?.('email_analytics_aggregate_member_stats_count');

        const memberAggregationStart = Date.now();
        if (useBatchProcessing) {
            logging.info(`[EmailAnalytics] Aggregating stats for ${memberIds.length} members using BATCHED mode (batch size: 100)`);
            const BATCH_SIZE = 100;
            for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
                const batch = memberIds.slice(i, i + BATCH_SIZE);
                await this.aggregateMemberStatsBatch(batch);
                memberMetric?.inc(batch.length);
            }
        } else {
            logging.info(`[EmailAnalytics] Aggregating stats for ${memberIds.length} members using SEQUENTIAL mode`);
            for (const memberId of memberIds) {
                await this.aggregateMemberStats(memberId);
                memberMetric?.inc();
            }
        }
        const memberAggregationTimeMs = Date.now() - memberAggregationStart;

        return {emailAggregationTimeMs, memberAggregationTimeMs};
    }

    async aggregateEmailStats(emailId: string, includeOpenedEvents?: boolean): Promise<unknown> {
        return await this.queries.aggregateEmailStats(emailId, includeOpenedEvents);
    }

    async aggregateMemberStats(memberId: string): Promise<unknown> {
        return await this.queries.aggregateMemberStats(memberId);
    }

    async aggregateMemberStatsBatch(memberIds: string[]): Promise<unknown> {
        return await this.queries.aggregateMemberStatsBatch(memberIds);
    }
}

export function createNewsletterEmailAnalyticsProcessor({
    config,
    domainEvents,
    db,
    queries,
    membersRepository,
    models,
    emailSuppressionList,
    prometheusClient
}: {
    config: Config,
    domainEvents: unknown,
    db: unknown,
    queries: Queries,
    membersRepository: MemberRepository,
    models: Models,
    emailSuppressionList: unknown,
    prometheusClient: PrometheusClient
}): NewsletterEmailAnalyticsProcessor {
    const eventStorage = new EmailEventStorage({
        db,
        membersRepository,
        models: {
            Email: models.Email,
            EmailRecipientFailure: models.EmailRecipientFailure,
            EmailSpamComplaintEvent: models.EmailSpamComplaintEvent
        },
        emailSuppressionList,
        prometheusClient
    });

    // Worker thread cannot dispatch directly, so processor posts events to job manager.
    const eventProcessor = new EmailEventProcessor({
        domainEvents,
        db,
        eventStorage,
        prometheusClient
    });

    return new NewsletterEmailAnalyticsProcessor({
        config,
        eventProcessor,
        queries,
        prometheusClient
    });
}
