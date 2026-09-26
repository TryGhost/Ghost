import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import type { ConfigInstance } from '../../../shared/config/loader';
import type { GhostMetrics } from '@tryghost/metrics';
import type { EmailProviderBase, EmailFamily } from '@tryghost/adapter-base-email';
import type { EmailEventService } from '../email-provider/event-service';
import { EmailAnalyticsServiceWrapper } from './email-analytics-service-wrapper';
import type { CursorSeed, JobNames } from './email-analytics-service';
import { Queries } from './lib/queries';
import { StartEmailAnalyticsJobEvent } from './events/start-email-analytics-job-event';
import { StartAutomationEmailAnalyticsJobEvent } from './events/start-automation-email-analytics-job-event';
import { StartGiftEmailAnalyticsJobEvent } from './events/start-gift-email-analytics-job-event';

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

const pipelines: Record<EmailFamily, { jobType: string; prefix: string; seed: CursorSeed }> = {
  newsletters: {
    jobType: 'email-analytics-fetch-latest',
    prefix: 'email-analytics',
    seed: {
      tableName: 'email_recipients',
      eventColumns: { delivered: 'delivered_at', opened: 'opened_at', failed: 'failed_at' },
    },
  },
  automations: {
    jobType: 'email-analytics-automation-fetch-latest',
    prefix: 'email-analytics-automation',
    seed: {
      tableName: 'automated_email_recipients',
      eventColumns: { delivered: 'delivered_at', opened: 'opened_at' },
    },
  },
  gifts: {
    jobType: 'email-analytics-gift-fetch-latest',
    prefix: 'email-analytics-gifts',
    seed: {
      tableName: 'gift_deliveries',
      eventColumns: { delivered: 'outcome_at', failed: 'outcome_at' },
    },
  },
};

export function init({
  config,
  db,
  domainEvents,
  metrics,
  settingsCache,
  provider,
  eventService,
}: {
  config: Pick<ConfigInstance, 'get'>;
  db: { knex: Knex };
  domainEvents: {
    subscribe: (
      event:
        | typeof StartEmailAnalyticsJobEvent
        | typeof StartAutomationEmailAnalyticsJobEvent
        | typeof StartGiftEmailAnalyticsJobEvent,
      callback: () => Promise<void>,
    ) => void;
  };
  metrics: Pick<GhostMetrics, 'metric'>;
  settingsCache: { get: (key: string) => unknown };
  provider: Pick<EmailProviderBase, 'getEventSource'>;
  eventService: Pick<EmailEventService, 'ingest'>;
}): void {
  if (newsletters) {
    return;
  }
  const source = provider.getEventSource();
  const wrappers = {} as Record<EmailFamily, EmailAnalyticsServiceWrapper>;
  for (const family of Object.keys(pipelines) as EmailFamily[]) {
    const pipeline = pipelines[family];
    const jobNames: JobNames = {
      latestNonOpened: `${pipeline.prefix}-latest-others`,
      missing: `${pipeline.prefix}-missing`,
      latestOpened: `${pipeline.prefix}-latest-opened`,
      scheduled: `${pipeline.prefix}-scheduled`,
    };
    wrappers[family] = new EmailAnalyticsServiceWrapper({
      logName: family,
      jobType: pipeline.jobType,
      config,
      queries: new Queries(db.knex),
      mailgunTags: [],
      jobNames,
      cursorSeed: pipeline.seed,
      metrics,
      settingsCache,
      polling: source.type === 'poll',
      fetchEvents: async (options) => {
        if (source.type === 'poll') {
          return source.fetch({ ...options, family });
        }
      },
      createEventProcessor: () => ({
        async processBatch(events, _result, fetchData) {
          await eventService.ingest(events, family);
          for (const event of events) {
            if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
              fetchData.lastEventTimestamp = event.timestamp;
            }
          }
        },
      }),
    });
  }
  newsletters = wrappers.newsletters;
  automations = wrappers.automations;
  gifts = wrappers.gifts;
  domainEvents.subscribe(StartEmailAnalyticsJobEvent, () => wrappers.newsletters.startFetch());
  domainEvents.subscribe(StartAutomationEmailAnalyticsJobEvent, () =>
    wrappers.automations.startFetch(),
  );
  domainEvents.subscribe(StartGiftEmailAnalyticsJobEvent, () => wrappers.gifts.startFetch());
}
