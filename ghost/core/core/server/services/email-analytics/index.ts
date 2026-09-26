import assert from 'node:assert/strict';
import {
  emailEventSchema,
  type EmailEvent,
  type EmailFamily,
  type EmailProviderBase,
} from '@tryghost/adapter-base-email';
import logging from '@tryghost/logging';
import { EmailEventService } from '../email-provider/event-service';
import type { BatchEventProcessor } from './batch-event-processor';
import type { Knex } from 'knex';
import type { PrometheusClient } from '@tryghost/prometheus-metrics';
import type { ConfigInstance } from '../../../shared/config/loader';
import type { GhostMetrics } from '@tryghost/metrics';
import { EmailAnalyticsServiceWrapper } from './email-analytics-service-wrapper';
// @ts-expect-error This module lacks type definitions.
import { AGGREGATE_MEMBER_STATS_METRIC_NAME } from './newsletter-email-analytics-batch-processor';
// @ts-expect-error This module lacks type definitions.
import { NewsletterEmailAnalyticsBatchProcessor } from './newsletter-email-analytics-batch-processor';
// @ts-expect-error This module lacks type definitions.
import NewsletterEmailEventStorage from '../email-service/newsletter-email-event-storage';
// @ts-expect-error This module lacks type definitions.
import EmailEventProcessor from '../email-service/email-event-processor';
import type membersService from '../members';
// @ts-expect-error This module lacks type definitions.
import type EmailSuppressionList from '../email-suppression-list';
// @ts-expect-error This module lacks type definitions.
import type { EmailRecipientFailure, EmailSpamComplaintEvent, Email } from '../../models';
// @ts-expect-error This module lacks type definitions.
import type DomainEvents from '@tryghost/domain-events';
import { Queries } from './lib/queries';
import { StartEmailAnalyticsJobEvent } from './events/start-email-analytics-job-event';
import { StartAutomationEmailAnalyticsJobEvent } from './events/start-automation-email-analytics-job-event';
import type * as AutomationsApi from '../automations/automations-api';
import { AutomationEmailAnalyticsBatchProcessor } from './automation-email-analytics-batch-processor';
import { GiftEmailAnalyticsBatchProcessor } from './gift-email-analytics-batch-processor';
import { StartGiftEmailAnalyticsJobEvent } from './events/start-gift-email-analytics-job-event';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';

let eventService: EmailEventService | undefined;
export function getEventService(): EmailEventService {
  assert(eventService, 'Email event service should be initialized');
  return eventService;
}

let newsletters: EmailAnalyticsServiceWrapper | undefined;
let automations: EmailAnalyticsServiceWrapper | undefined;
let gifts: EmailAnalyticsServiceWrapper | undefined;

export function getNewsletters(): EmailAnalyticsServiceWrapper {
  assert(newsletters, 'Newsletter email analytics should be initialized');
  return newsletters;
}

export function getAutomations(): EmailAnalyticsServiceWrapper {
  assert(automations, 'Automation email analytics should be initialized');
  return automations;
}

export function getGifts(): EmailAnalyticsServiceWrapper {
  assert(gifts, 'Gift email analytics should be initialized');
  return gifts;
}

export const init = ({
  provider,
  automationsApi,
  config,
  db,
  domainEvents,
  emailSuppressionList,
  giftDeliveryService,
  membersRepository,
  models: { Email, EmailRecipientFailure, EmailSpamComplaintEvent },
  metrics,
  prometheusClient,
}: {
  provider: Pick<EmailProviderBase, 'source' | 'getEventSource'>;
  automationsApi: Pick<
    typeof AutomationsApi,
    'getAutomatedEmailRecipientsByMailgunIds' | 'trackEmailDeliveredAndOpened'
  >;
  config: Pick<ConfigInstance, 'get'>;
  db: { knex: Knex };
  domainEvents: Pick<DomainEvents, 'subscribe'>;
  emailSuppressionList: Pick<
    typeof EmailSuppressionList,
    'removeComplaint' | 'removeUnsubscribe' | 'handleBounce' | 'handleComplaint'
  >;
  giftDeliveryService: Pick<GiftDeliveryService, 'recordOutcome' | 'getRecipientEmailForMessage'>;
  membersRepository: Pick<
    typeof membersService.api.members,
    'get' | 'update' | 'unsubscribeFromUpdates'
  >;
  models: {
    Email: Email;
    EmailRecipientFailure: EmailRecipientFailure;
    EmailSpamComplaintEvent: EmailSpamComplaintEvent;
  };
  metrics: Pick<GhostMetrics, 'metric'>;
  prometheusClient: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;
}) => {
  if (newsletters) {
    return;
  }

  const queries = new Queries(db.knex);
  const source = provider.getEventSource();

  // Each fetch or webhook owns its buffers; concurrent requests must not flush
  // or clear another request's pending newsletter updates.
  const createEventProcessor = (family: EmailFamily): BatchEventProcessor => {
    if (family === 'automations') {
      return new AutomationEmailAnalyticsBatchProcessor({
        automationsApi,
        emailSuppressionList,
        membersRepository,
        requireProviderCleanup: source.type === 'webhook',
        skipFailedEvents: source.type === 'poll',
      });
    }
    if (family === 'gifts') {
      return new GiftEmailAnalyticsBatchProcessor({
        giftDeliveryService,
        emailSuppressionList,
        requireProviderCleanup: source.type === 'webhook',
        skipFailedEvents: source.type === 'poll',
      });
    }
    return new NewsletterEmailAnalyticsBatchProcessor({
      config,
      skipFailedEvents: source.type === 'poll',
      emailEventProcessor: new EmailEventProcessor({
        domainEvents,
        db,
        eventStorage: new NewsletterEmailEventStorage({
          config,
          db,
          membersRepository,
          models: { Email, EmailRecipientFailure, EmailSpamComplaintEvent },
          emailSuppressionList,
          requireProviderCleanup: source.type === 'webhook',
          prometheusClient,
        }),
        prometheusClient,
      }),
      prometheusClient,
      queries,
    });
  };
  eventService = new EmailEventService({ provider, createEventProcessor });
  const eventSourceOptions = (family: EmailFamily) => ({
    polling: source.type === 'poll',
    fetchEvents: async (
      options: Parameters<import('./email-analytics-service').FetchEvents>[0],
    ) => {
      if (source.type === 'poll') {
        return await source.fetch({
          ...options,
          family,
        });
      }
    },
    createEventProcessor: (): BatchEventProcessor => {
      const processor = createEventProcessor(family);
      return {
        async processBatch(events, result, fetchData) {
          const validEvents: EmailEvent[] = [];
          for (const event of events) {
            const parsed = emailEventSchema.safeParse(event);
            if (parsed.success && parsed.data.family === family) {
              validEvents.push(parsed.data);
              continue;
            }
            result.merge({ unprocessable: 1 });
            // Invalid rows still count towards the polling limit and cursor.
            // Never let a malformed timestamp replace the last usable cursor.
            const timestamp = emailEventSchema.shape.timestamp.safeParse(event?.timestamp);
            if (
              timestamp.success &&
              (!fetchData.lastEventTimestamp || timestamp.data > fetchData.lastEventTimestamp)
            ) {
              fetchData.lastEventTimestamp = timestamp.data;
            }
          }
          if (validEvents.length !== events.length) {
            logging.warn(
              `[EmailAnalytics] Skipped ${events.length - validEvents.length} invalid ${family} events`,
            );
          }
          await processor.processBatch(validEvents, result, fetchData);
        },
        aggregate: processor.aggregate?.bind(processor),
      };
    },
  });

  prometheusClient?.registerCounter({
    name: AGGREGATE_MEMBER_STATS_METRIC_NAME,
    help: 'Count of member stats aggregations',
  });

  newsletters = new EmailAnalyticsServiceWrapper({
    logName: 'newsletters',
    jobType: 'email-analytics-fetch-latest',
    config,
    queries,
    ...eventSourceOptions('newsletters'),
    jobNames: {
      latestNonOpened: 'email-analytics-latest-others',
      missing: 'email-analytics-missing',
      latestOpened: 'email-analytics-latest-opened',
      scheduled: 'email-analytics-scheduled',
    },
    cursorSeed: {
      tableName: 'email_recipients',
      eventColumns: {
        delivered: 'delivered_at',
        opened: 'opened_at',
        failed: 'failed_at',
      },
    },
    metrics,
  });

  automations = new EmailAnalyticsServiceWrapper({
    logName: 'automations',
    jobType: 'email-analytics-automation-fetch-latest',
    config,
    queries,
    ...eventSourceOptions('automations'),
    jobNames: {
      latestNonOpened: 'email-analytics-automation-latest-others',
      missing: 'email-analytics-automation-missing',
      latestOpened: 'email-analytics-automation-latest-opened',
      scheduled: 'email-analytics-automation-scheduled',
    },
    cursorSeed: {
      tableName: 'automated_email_recipients',
      eventColumns: {
        delivered: 'delivered_at',
        opened: 'opened_at',
      },
    },
    metrics,
  });

  gifts = new EmailAnalyticsServiceWrapper({
    logName: 'gifts',
    jobType: 'email-analytics-gift-fetch-latest',
    config,
    queries,
    ...eventSourceOptions('gifts'),
    jobNames: {
      latestNonOpened: 'email-analytics-gifts-latest-others',
      missing: 'email-analytics-gifts-missing',
      latestOpened: 'email-analytics-gifts-latest-opened',
      scheduled: 'email-analytics-gifts-scheduled',
    },
    cursorSeed: {
      tableName: 'gift_deliveries',
      eventColumns: {
        delivered: 'outcome_at',
        failed: 'outcome_at',
      },
    },
    metrics,
  });

  domainEvents.subscribe(StartEmailAnalyticsJobEvent, () => newsletters!.startFetch());

  domainEvents.subscribe(StartAutomationEmailAnalyticsJobEvent, () => automations!.startFetch());

  domainEvents.subscribe(StartGiftEmailAnalyticsJobEvent, () => gifts!.startFetch());
};
