import EmailAnalyticsGiftFetchLatestJob from './email-analytics-gift-fetch-latest-job';
import EmailAnalyticsAutomationFetchLatestJob from './email-analytics-automation-fetch-latest-job';
import EmailAnalyticsFetchLatestJob from './email-analytics-fetch-latest-job';
import moment from 'moment';
import type { Job, JobConstructor } from '../../jobs-service/job';
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
function randomFiveMinuteCron(): string {
  // Use a random seconds value to avoid spikes to external APIs on the minute.
  const seconds = Math.floor(Math.random() * 60); // 0-59
  // Run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc.
  const minutes = Math.floor(Math.random() * 5); // 0-4

  return `${seconds} ${minutes}/5 * * * *`;
}

type RecurringJobClass = JobConstructor<Job, void>;

function thirtyDaysAgo(): Date {
  return moment.utc().subtract(30, 'days').toDate();
}

export class EmailAnalyticsJobScheduler {
  readonly #scheduledJobTypes = new Set<string>();
  readonly #models: Models;
  readonly #config: Config;
  readonly #jobsService: Pick<JobsService, 'scheduleRecurring'>;

  constructor({
    models,
    config,
    jobsService,
  }: {
    models: Models;
    config: Config;
    jobsService: Pick<JobsService, 'scheduleRecurring'>;
  }) {
    this.#models = models;
    this.#config = config;
    this.#jobsService = jobsService;
  }

  #isConfigured(): boolean {
    return Boolean(
      this.#config.get('emailAnalytics:enabled') &&
      this.#config.get('backgroundJobs:emailAnalytics'),
    );
  }

  /**
   * Registers the newsletter analytics job on a randomized five-minute cron
   * when recent non-failed emails exist. The bypass skips only that data check;
   * configuration and duplicate-registration guards still apply.
   */
  async scheduleRecurringNewslettersJob(skipNewsletterEmailCheck: boolean = false): Promise<void> {
    // Don't register email analytics job if we have no emails,
    // processor usage from many sites spinning up threads can be high.
    // Mega service will re-run this scheduling task when an email is sent
    await this.#scheduleOnce(
      EmailAnalyticsFetchLatestJob,
      skipNewsletterEmailCheck,
      async () =>
        Number(
          await this.#models.Email.where('created_at', '>', thirtyDaysAgo())
            .where('status', '<>', 'failed')
            .count(),
        ) > 0,
    );
  }

  /**
   * Registers the automation analytics job on a randomized five-minute cron
   * when a recent recipient has a provider message ID. The bypass skips only
   * that data check; configuration and duplicate-registration guards still
   * apply.
   */
  async scheduleRecurringAutomationsJob(skipAutomationEmailCheck: boolean = false): Promise<void> {
    await this.#scheduleOnce(
      EmailAnalyticsAutomationFetchLatestJob,
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

  /**
   * Registers the gift analytics job on a randomized five-minute cron when a
   * recent delivery has a provider message ID. The bypass skips only that data
   * check; configuration and duplicate-registration guards still apply.
   */
  async scheduleRecurringGiftDeliveriesJob(skipGiftDeliveryCheck: boolean = false): Promise<void> {
    await this.#scheduleOnce(EmailAnalyticsGiftFetchLatestJob, skipGiftDeliveryCheck, async () =>
      Boolean(
        await this.#models.GiftDelivery.query()
          .where('email_sent_at', '>', thirtyDaysAgo())
          .whereNotNull('email_provider_message_id')
          .first('id'),
      ),
    );
  }

  async #scheduleOnce(
    JobClass: RecurringJobClass,
    skipRecentSendsCheck: boolean,
    hasRecentSends: () => Promise<boolean>,
  ): Promise<void> {
    if (this.#scheduledJobTypes.has(JobClass.type) || !this.#isConfigured()) {
      return;
    }

    const shouldSchedule = skipRecentSendsCheck || (await hasRecentSends());
    if (!shouldSchedule || this.#scheduledJobTypes.has(JobClass.type)) {
      return;
    }

    // Marked before the backend call so a caller arriving while it is in
    // flight returns above instead of logging and registering a second
    // schedule with a different cron. Unmarked on rejection so the next
    // caller can retry.
    this.#scheduledJobTypes.add(JobClass.type);
    const at = randomFiveMinuteCron();
    logging.info(`[Background Job] ${JobClass.type} scheduled at ${at}`);
    try {
      await this.#jobsService.scheduleRecurring(new JobClass(), { cron: at });
    } catch (error) {
      this.#scheduledJobTypes.delete(JobClass.type);
      throw error;
    }
  }
}
