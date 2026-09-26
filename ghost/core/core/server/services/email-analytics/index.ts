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
  providers,
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
  providers: readonly Pick<EmailProviderBase, 'source' | 'getEventSource'>[];
  eventService: Pick<EmailEventService, 'ingest'>;
}): void {
  if (newsletters) {
    return;
  }
  assert(providers.length, 'Email analytics requires a provider');
  const wrappers: Record<EmailFamily, EmailAnalyticsServiceWrapper[]> = {
    newsletters: [],
    automations: [],
    gifts: [],
  };
  for (const provider of providers) {
    const source = provider.getEventSource();
    for (const family of Object.keys(pipelines) as EmailFamily[]) {
      const pipeline = pipelines[family];
      // Keep existing Mailgun cursors intact. Other accounts cannot share them.
      const prefix = pipeline.prefix + (provider.source === 'mailgun' ? '' : `-${provider.source}`);
      const jobNames: JobNames = {
        latestNonOpened: `${prefix}-latest-others`,
        missing: `${prefix}-missing`,
        latestOpened: `${prefix}-latest-opened`,
        scheduled: `${prefix}-scheduled`,
      };
      wrappers[family].push(
        new EmailAnalyticsServiceWrapper({
          logName: provider.source === 'mailgun' ? family : `${family}:${provider.source}`,
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
              await eventService.ingest(provider.source, events, family);
              for (const event of events) {
                if (
                  !fetchData.lastEventTimestamp ||
                  event.timestamp > fetchData.lastEventTimestamp
                ) {
                  fetchData.lastEventTimestamp = event.timestamp;
                }
              }
            },
          }),
        }),
      );
    }
  }
  [newsletters] = wrappers.newsletters;
  [automations] = wrappers.automations;
  [gifts] = wrappers.gifts;
  const start = async (family: EmailFamily) => {
    await Promise.all(wrappers[family].map((wrapper) => wrapper.startFetch()));
  };
  domainEvents.subscribe(StartEmailAnalyticsJobEvent, () => start('newsletters'));
  domainEvents.subscribe(StartAutomationEmailAnalyticsJobEvent, () => start('automations'));
  domainEvents.subscribe(StartGiftEmailAnalyticsJobEvent, () => start('gifts'));
}
