import * as path from 'node:path';
import moment from 'moment';
import type * as bookshelf from 'bookshelf';

type Models = {Email: bookshelf.Model<any>};
type Config = {get(key: string): unknown};
type JobManager = {
    addJob(options: {
        job: string;
        name: string;
        at: string;
    }): void;
};

export class EmailAnalyticsJobScheduler {
    #hasScheduled = false;
    readonly #models: Models;
    readonly #config: Config;
    readonly #jobManager: JobManager;

    constructor(models: Models, config: Config, jobManager: JobManager) {
        this.#models = models;
        this.#config = config;
        this.#jobManager = jobManager;
    }

    async scheduleRecurringJobs(skipEmailCheck = false): Promise<void> {
        if (
            !this.#hasScheduled &&
            this.#config.get('emailAnalytics:enabled') &&
            this.#config.get('backgroundJobs:emailAnalytics')
        ) {
            // Don't register email analytics job if we have no emails,
            // processor usage from many sites spinning up threads can be high.
            // Mega service will re-run this scheduling task when an email is sent
            const emailCount = skipEmailCheck ? 1 : Number(await this.#models.Email
                .where('created_at', '>', moment.utc().subtract(30, 'days').toISOString())
                .where('status', '<>', 'failed')
                .count());

            if (emailCount > 0) {
                // use a random seconds value to avoid spikes to external APIs on the minute
                const s = Math.floor(Math.random() * 60); // 0-59
                // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
                const m = Math.floor(Math.random() * 5); // 0-4

                this.#jobManager.addJob({
                    at: `${s} ${m}/5 * * * *`,
                    job: path.resolve(__dirname, 'fetch-latest/index.js'),
                    name: 'email-analytics-fetch-latest'
                });

                this.#hasScheduled = true;
            }
        }
    }
}
