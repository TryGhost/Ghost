import * as path from 'node:path';
import moment from 'moment';

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
};
type Config = {get(key: string): unknown};
type JobManager = {
    addJob(options: {
        job: string;
        name: string;
        at: string;
    }): void;
};

function randomFiveMinuteCron(): string {
    // Use a random seconds value to avoid spikes to external APIs on the minute.
    const seconds = Math.floor(Math.random() * 60); // 0-59
    // Run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc.
    const minutes = Math.floor(Math.random() * 5); // 0-4

    return `${seconds} ${minutes}/5 * * * *`;
}

export class EmailAnalyticsJobScheduler {
    #hasScheduledNewslettersJob = false;
    #hasScheduledAutomationsJob = false;
    readonly #models: Models;
    readonly #config: Config;
    readonly #jobManager: JobManager;

    constructor({
        models,
        config,
        jobManager
    }: {
        models: Models,
        config: Config,
        jobManager: JobManager
    }) {
        this.#models = models;
        this.#config = config;
        this.#jobManager = jobManager;
    }

    #isConfigured(): boolean {
        return Boolean(
            this.#config.get('emailAnalytics:enabled') &&
            this.#config.get('backgroundJobs:emailAnalytics')
        );
    };

    async scheduleRecurringNewslettersJob(skipNewsletterEmailCheck: boolean = false): Promise<void> {
        if (this.#hasScheduledNewslettersJob) {
            return;
        }

        if (!this.#isConfigured()) {
            return;
        }

        // Don't register email analytics job if we have no emails,
        // processor usage from many sites spinning up threads can be high.
        // Mega service will re-run this scheduling task when an email is sent
        const emailCount = skipNewsletterEmailCheck ? 1 : Number(await this.#models.Email
            .where('created_at', '>', moment.utc().subtract(30, 'days').toDate())
            .where('status', '<>', 'failed')
            .count());

        if (emailCount > 0 && !this.#hasScheduledNewslettersJob) {
            this.#jobManager.addJob({
                at: randomFiveMinuteCron(),
                job: path.resolve(__dirname, 'fetch-latest/index.js'),
                name: 'email-analytics-fetch-latest'
            });

            this.#hasScheduledNewslettersJob = true;
        }
    }

    async scheduleRecurringAutomationsJob(skipAutomationEmailCheck: boolean = false): Promise<void> {
        if (this.#hasScheduledAutomationsJob) {
            return;
        }

        if (!this.#isConfigured()) {
            return;
        }

        const hasAutomatedEmailRecipient = (
            skipAutomationEmailCheck ||
            Boolean(
                await this.#models.AutomatedEmailRecipient
                    .query()
                    .where('created_at', '>', moment.utc().subtract(30, 'days').toDate())
                    .whereNotNull('mailgun_message_id')
                    .first('id')
            )
        );
        if (!hasAutomatedEmailRecipient || this.#hasScheduledAutomationsJob) {
            return;
        }

        this.#jobManager.addJob({
            at: randomFiveMinuteCron(),
            job: path.resolve(__dirname, 'automation-fetch-latest/index.js'),
            name: 'email-analytics-automation-fetch-latest'
        });

        this.#hasScheduledAutomationsJob = true;
    }
}
