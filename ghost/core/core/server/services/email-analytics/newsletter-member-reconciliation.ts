import logging from '@tryghost/logging';
import { z } from 'zod';
import { Job } from '../jobs-service/job';
import type { JobsService } from '../jobs-service/jobs-service';
import type { NewsletterMemberCounters } from './newsletter-member-counters';

export class ReconcileNewsletterMembersJob extends Job {
  static type = 'email-analytics-member-reconciliation';
}

const MAX_BATCH_SIZE = 5000;
const TICK_INTERVAL_MS = 5 * 60 * 1000;
// The queue serializes deliveries, so ticks that arrive while a page is running
// drain the moment it ends. Skip any tick sooner than the schedule would have
// delivered it, and leave a gap after each page, so pages never run back to back.
const MIN_PAGE_SPACING_MS = TICK_INTERVAL_MS - 30 * 1000;
const MIN_GAP_AFTER_PAGE_MS = 60 * 1000;
const ReconciliationSettings = z.object({
  batchSize: z.number().int().min(1).max(MAX_BATCH_SIZE).default(MAX_BATCH_SIZE),
  pauseHours: z.number().finite().min(0).default(6),
});
export type ReconciliationSettings = z.output<typeof ReconciliationSettings>;

/**
 * Config is boundary data: an unusable page size or pause is logged and
 * leaves scheduled repair off rather than stopping the site from booting.
 */
export function resolveReconciliationSettings(configured: {
  batchSize?: unknown;
  pauseHours?: unknown;
}): ReconciliationSettings | null {
  const parsed = ReconciliationSettings.safeParse({
    batchSize: configured.batchSize ?? undefined,
    pauseHours: configured.pauseHours ?? undefined,
  });
  if (!parsed.success) {
    logging.warn(
      `[EmailAnalytics] Ignoring unusable member reconciliation settings ${JSON.stringify(configured)}: batch size must be 1 to ${MAX_BATCH_SIZE} and the pause a non-negative number of hours; scheduled member repair is off`,
    );
    return null;
  }
  return parsed.data;
}

/**
 * Boot-owned recurring use of the same sweep that initializes member counters.
 * Constructed at module scope like the analytics wrappers and configured by
 * init(), so registering and scheduling never depend on call order.
 */
export class NewsletterMemberReconciliation {
  #counters: Pick<NewsletterMemberCounters, 'runSweepPage'> | null = null;
  #enabled = false;
  #settings: ReconciliationSettings = ReconciliationSettings.parse({});
  #running = false;
  #lastPageStartedAt = -Infinity;
  #lastPageEndedAt = -Infinity;

  configure({
    counters,
    enabled,
    settings,
  }: {
    counters: Pick<NewsletterMemberCounters, 'runSweepPage'> | null;
    enabled: boolean;
    settings: { batchSize?: unknown; pauseHours?: unknown };
  }): void {
    const resolved = resolveReconciliationSettings(settings);
    this.#counters = counters;
    this.#settings = resolved ?? this.#settings;
    this.#enabled = enabled && Boolean(counters) && resolved !== null;
    if (enabled && !this.#enabled) {
      logging.warn('[EmailAnalytics] Scheduled member counter repair is off');
    } else if (this.#enabled) {
      logging.info(
        `[EmailAnalytics] Scheduled member counter repair: pages of ${this.#settings.batchSize} members, ${this.#settings.pauseHours} hour pause after each full pass`,
      );
    }
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  get settings(): ReconciliationSettings {
    return this.#settings;
  }

  register(jobs: Pick<JobsService, 'handle'>): void {
    // Retain a no-op handler when disabled so an older queued delivery cannot
    // run counter repairs alongside legacy writers after a configuration change.
    jobs.handle(
      ReconcileNewsletterMembersJob,
      async () => {
        if (!this.#enabled || !this.#counters) {
          return;
        }
        const now = Date.now();
        if (this.#running) {
          logging.info(
            '[EmailAnalytics] Skipping member reconciliation tick: a page is still running',
          );
          return;
        }
        if (
          now < this.#lastPageStartedAt + MIN_PAGE_SPACING_MS ||
          now < this.#lastPageEndedAt + MIN_GAP_AFTER_PAGE_MS
        ) {
          logging.info(
            '[EmailAnalytics] Skipping member reconciliation tick: a page ran too recently',
          );
          return;
        }
        this.#running = true;
        this.#lastPageStartedAt = now;
        try {
          const checkpoint = await this.#counters.runSweepPage({
            limit: this.#settings.batchSize,
            // Fractional hours are allowed; the sweep wants whole milliseconds.
            startAnotherAfterMs: Math.round(this.#settings.pauseHours * 60 * 60 * 1000),
          });
          if (checkpoint.paused) {
            return;
          }
          logging.info(
            {
              system: {
                event: 'email-analytics.member-reconciliation',
                members_processed: checkpoint.processed,
                complete: checkpoint.complete,
                after_id: checkpoint.afterId,
              },
            },
            '[EmailAnalytics] Member reconciliation checkpoint',
          );
        } finally {
          this.#running = false;
          this.#lastPageEndedAt = Date.now();
        }
      },
      { queue: 'newsletter-member-reconciliation', concurrency: 1 },
    );
  }

  async schedule(jobs: Pick<JobsService, 'scheduleRecurring'>): Promise<void> {
    if (!this.#enabled) {
      return;
    }
    const seconds = Math.floor(Math.random() * 60);
    const minutes = Math.floor(Math.random() * 5);
    await jobs.scheduleRecurring(new ReconcileNewsletterMembersJob(), {
      cron: `${seconds} ${minutes}/5 * * * *`,
    });
  }
}
