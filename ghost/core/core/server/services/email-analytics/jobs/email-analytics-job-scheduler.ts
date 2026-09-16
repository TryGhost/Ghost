import EmailAnalyticsAutomationFetchLatestJob from './email-analytics-automation-fetch-latest-job';
import EmailAnalyticsFetchLatestJob from './email-analytics-fetch-latest-job';
import * as path from 'node:path';
import moment from 'moment';
import type { JobsService } from '../../jobs-service/jobs-service';

const logging = require('@tryghost/logging');

type CountableQuery = {
  where(column: string, operator: string, value: unknown): CountableQuery;
  count(): Promise<string | number>;
};
type ExistingRecipientQuery = {
  where(column: string, operator: string, value: unknown): ExistingRecipientQuery;
  whereNotNull(column: string): ExistingRecipientQuery;
  first(column: string): Promise<unknown>;
};
type Models = {
  Email: {
    where(column: string, operator: string, value: unknown): CountableQuery;
  };
  AutomatedEmailRecipient: {
    query(): ExistingRecipientQuery;
  };
  GiftDelivery: {
    query(): ExistingRecipientQuery;
  };
};
type Config = { get(key: string): unknown };
type JobManager = {
  addJob(options: { job: string; name: string; at: string }): void;
};

function randomFiveMinuteCron(): string {
  // Use a random seconds value to avoid spikes to external APIs on the minute.
  const seconds = Math.floor(Math.random() * 60); // 0-59
  // Run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc.
  const minutes = Math.floor(Math.random() * 5); // 0-4

  return `${seconds} ${minutes}/5 * * * *`;
}

function thirtyDaysAgo(): Date {
  return moment.utc().subtract(30, 'days').toDate();
}

type RecurringJob = { name: string; register: (at: string) => Promise<void> | void };

export class EmailAnalyticsJobScheduler {
  readonly #scheduledJobNames = new Set<string>();
  readonly #models: Models;
  readonly #config: Config;
  readonly #jobManager: JobManager;
  readonly #jobsService: Pick<JobsService, 'scheduleRecurring'>;

  constructor({
    models,
    config,
    jobManager,
    jobsService,
  }: {
    models: Models;
    config: Config;
    jobManager: JobManager;
    jobsService: Pick<JobsService, 'scheduleRecurring'>;
  }) {
    this.#models = models;
    this.#config = config;
    this.#jobManager = jobManager;
    this.#jobsService = jobsService;
  }

  #isConfigured(): boolean {
    return Boolean(
      this.#config.get('emailAnalytics:enabled') &&
      this.#config.get('backgroundJobs:emailAnalytics'),
    );
  }

  async scheduleRecurringNewslettersJob(skipNewsletterEmailCheck: boolean = false): Promise<void> {
    // Don't register email analytics job if we have no emails,
    // processor usage from many sites spinning up threads can be high.
    // Mega service will re-run this scheduling task when an email is sent
    await this.#scheduleOnce(
      {
        name: EmailAnalyticsFetchLatestJob.type,
        register: (at) =>
          this.#jobsService.scheduleRecurring(new EmailAnalyticsFetchLatestJob(), { cron: at }),
      },
      skipNewsletterEmailCheck,
      async () =>
        Number(
          await this.#models.Email.where('created_at', '>', thirtyDaysAgo())
            .where('status', '<>', 'failed')
            .count(),
        ) > 0,
    );
  }

  async scheduleRecurringAutomationsJob(skipAutomationEmailCheck: boolean = false): Promise<void> {
    await this.#scheduleOnce(
      {
        name: EmailAnalyticsAutomationFetchLatestJob.type,
        register: (at) =>
          this.#jobsService.scheduleRecurring(new EmailAnalyticsAutomationFetchLatestJob(), {
            cron: at,
          }),
      },
      skipAutomationEmailCheck,
      async () =>
        Boolean(
          await this.#models.AutomatedEmailRecipient.query()
            .where('created_at', '>', thirtyDaysAgo())
            .whereNotNull('mailgun_message_id')
            .first('id'),
        ),
    );
  }

  async scheduleRecurringGiftDeliveriesJob(skipGiftDeliveryCheck: boolean = false): Promise<void> {
    await this.#scheduleOnce(
      this.#legacyJob('email-analytics-gift-fetch-latest', 'gift-fetch-latest/index.js'),
      skipGiftDeliveryCheck,
      async () =>
        Boolean(
          await this.#models.GiftDelivery.query()
            .where('email_sent_at', '>', thirtyDaysAgo())
            .whereNotNull('email_provider_message_id')
            .first('id'),
        ),
    );
  }

  async #scheduleOnce(
    job: RecurringJob,
    skipRecentSendsCheck: boolean,
    hasRecentSends: () => Promise<boolean>,
  ): Promise<void> {
    if (this.#scheduledJobNames.has(job.name) || !this.#isConfigured()) {
      return;
    }

    const shouldSchedule = skipRecentSendsCheck || (await hasRecentSends());
    if (!shouldSchedule || this.#scheduledJobNames.has(job.name)) {
      return;
    }

    // Marked before registering so a caller arriving while an async
    // registration is in flight returns above instead of registering a second
    // schedule with a different cron. Unmarked on rejection so the next caller
    // can retry.
    this.#scheduledJobNames.add(job.name);
    const at = randomFiveMinuteCron();
    logging.info(`[Background Job] ${job.name} scheduled at ${at}`);
    try {
      await job.register(at);
    } catch (error) {
      this.#scheduledJobNames.delete(job.name);
      throw error;
    }
  }

  #legacyJob(name: string, worker: string): RecurringJob {
    return {
      name,
      register: (at) => this.#jobManager.addJob({ at, job: path.resolve(__dirname, worker), name }),
    };
  }
}
