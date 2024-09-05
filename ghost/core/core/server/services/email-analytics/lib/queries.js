const _ = require('lodash');
const debug = require('@tryghost/debug')('services:email-analytics');
const db = require('../../../data/db');
const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');

const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

/** @typedef {'email-analytics-latest-opened'|'email-analytics-latest-others'|'email-analytics-missing'|'email-analytics-scheduled'} EmailAnalyticsJobName */
/** @typedef {'delivered'|'opened'|'failed'} EmailAnalyticsEvent */

/**
 * Creates a job in the jobs table if it does not already exist.
 * @param {EmailAnalyticsJobName} jobName - The name of the job to create.
 * @returns {Promise<void>}
 */
async function createJobIfNotExists(jobName) {
    await db.knex('jobs').insert({
        id: new ObjectID().toHexString(),
        name: jobName,
        started_at: new Date(),
        created_at: new Date(),
        status: 'started'
    }).onConflict('name').ignore();
}

module.exports = {
    async shouldFetchStats() {
        // don't fetch stats from Mailgun if we haven't sent any emails
        const [emailCount] = await db.knex('emails').count('id as count');
        return emailCount && emailCount.count > 0;
    },

    /**
     * Retrieves the timestamp of the last seen event for the specified email analytics events.
     * @param {EmailAnalyticsJobName} jobName - The name of the job to update.
     * @param {EmailAnalyticsEvent[]} [events=['delivered', 'opened', 'failed']] - The email analytics events to consider.
     * @returns {Promise<Date|null>} The timestamp of the last seen event, or null if no events are found.
     */
    async getLastEventTimestamp(jobName, events = ['delivered', 'opened', 'failed']) {
        const startDate = new Date();
        
        let maxOpenedAt;
        let maxDeliveredAt;
        let maxFailedAt;
        const lastJobRunTimestamp = await this.getLastJobRunTimestamp(jobName);

        if (lastJobRunTimestamp) {
            debug(`Using job data for ${jobName}`);
            maxOpenedAt = events.includes('opened') ? lastJobRunTimestamp : null;
            maxDeliveredAt = events.includes('delivered') ? lastJobRunTimestamp : null;
            maxFailedAt = events.includes('failed') ? lastJobRunTimestamp : null;
        } else {
            debug(`Job data not found for ${jobName}, using email_recipients data`);
            logging.info(`Job data not found for ${jobName}, using email_recipients data`);
            if (events.includes('opened')) {
                maxOpenedAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(opened_at) as maxOpenedAt')).first()).maxOpenedAt;
            }
            if (events.includes('delivered')) {
                maxDeliveredAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(delivered_at) as maxDeliveredAt')).first()).maxDeliveredAt;
            }
            if (events.includes('failed')) {
                maxFailedAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(failed_at) as maxFailedAt')).first()).maxFailedAt;
            }

            await createJobIfNotExists(jobName);
        }

        // Convert string dates to Date objects for SQLite compatibility
        [maxOpenedAt, maxDeliveredAt, maxFailedAt] = [maxOpenedAt, maxDeliveredAt, maxFailedAt].map(date => (
            date && !(date instanceof Date) ? new Date(date) : date
        ));

        const lastSeenEventTimestamp = _.max([maxOpenedAt, maxDeliveredAt, maxFailedAt]);
        debug(`getLastEventTimestamp: finished in ${Date.now() - startDate}ms`);

        return lastSeenEventTimestamp;
    },

    /**
     * Retrieves the job data for the specified job name.
     * @param {EmailAnalyticsJobName} jobName - The name of the job to retrieve data for.
     * @returns {Promise<Object|null>} The job data, or null if no job data is found.
     */
    async getJobData(jobName) {
        return await db.knex('jobs').select('finished_at', 'started_at').where('name', jobName).first();
    },

    /**
     * Retrieves the timestamp of the last job run for the specified job name.
     * @param {EmailAnalyticsJobName} jobName - The name of the job to retrieve the last run timestamp for.
     * @returns {Promise<Date|null>} The timestamp of the last job run, or null if no job data is found.
     */
    async getLastJobRunTimestamp(jobName) {
        const jobData = await this.getJobData(jobName);
        return jobData ? jobData.finished_at || jobData.started_at : null;
    },

    /**
     * Sets the timestamp of the last seen event for the specified email analytics events.
     * @param {EmailAnalyticsJobName} jobName - The name of the job to update.
     * @param {'completed'|'started'} field - The field to update.
     * @param {Date} date - The timestamp of the last seen event.
     * @returns {Promise<void>}
     * @description
     * Updates the `finished_at` or `started_at` column of the specified job in the `jobs` table with the provided timestamp.
     * This is used to keep track of the last time the job was run to avoid expensive queries following reboot.
     */
    async setJobTimestamp(jobName, field, date) {
        // Convert string dates to Date objects for SQLite compatibility
        try {
            debug(`Setting ${field} timestamp for job ${jobName} to ${date}`);
            const updateField = field === 'completed' ? 'finished_at' : 'started_at';
            const status = field === 'completed' ? 'finished' : 'started';
            const result = await db.knex('jobs').update({[updateField]: date, updated_at: new Date(), status: status}).where('name', jobName);
            if (result === 0) {
                await db.knex('jobs').insert({
                    id: new ObjectID().toHexString(),
                    name: jobName,
                    [updateField]: date,
                    updated_at: date,
                    status: status
                });
            }
        } catch (err) {
            debug(`Error setting ${field} timestamp for job ${jobName}: ${err.message}`);
        }
    },

    /**
     * Sets the status of the specified email analytics job.
     * @param {EmailAnalyticsJobName} jobName - The name of the job to update.
     * @param {'started'|'finished'|'failed'} status - The new status of the job.
     * @returns {Promise<void>}
     * @description
     * Updates the `status` column of the specified job in the `jobs` table with the provided status.
     * This is used to keep track of the current state of the job.
     */
    async setJobStatus(jobName, status) {
        debug(`Setting status for job ${jobName} to ${status}`);
        try {
            const result = await db.knex('jobs')
                .update({
                    status: status,
                    updated_at: new Date()
                })
                .where('name', jobName);

            if (result === 0) {
                await db.knex('jobs').insert({
                    id: new ObjectID().toHexString(),
                    name: jobName,
                    status: status,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
        } catch (err) {
            debug(`Error setting status for job ${jobName}: ${err.message}`);
            throw err;
        }
    },

    async aggregateEmailStats(emailId, updateOpenedCount) {
        const [deliveredCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND delivered_at IS NOT NULL', [emailId]);
        const [failedCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND failed_at IS NOT NULL', [emailId]);

        const updateData = {
            delivered_count: deliveredCount.count,
            failed_count: failedCount.count
        };

        if (updateOpenedCount) {
            const [openedCount] = await db.knex('email_recipients').count('id as count').whereRaw('email_id = ? AND opened_at IS NOT NULL', [emailId]);
            updateData.opened_count = openedCount.count;
        }

        await db.knex('emails').update(updateData).where('id', emailId);
    },

    async aggregateMemberStats(memberId) {
        const {trackedEmailCount} = await db.knex('email_recipients')
            .select(db.knex.raw('COUNT(email_recipients.id) as trackedEmailCount'))
            .leftJoin('emails', 'email_recipients.email_id', 'emails.id')
            .where('email_recipients.member_id', memberId)
            .where('emails.track_opens', true)
            .first() || {};

        const [emailCount] = await db.knex('email_recipients').count('id as count').whereRaw('member_id = ?', [memberId]);
        const [emailOpenedCount] = await db.knex('email_recipients').count('id as count').whereRaw('member_id = ? AND opened_at IS NOT NULL', [memberId]);

        const updateQuery = {
            email_count: emailCount.count,
            email_opened_count: emailOpenedCount.count
        };

        if (trackedEmailCount >= MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
            updateQuery.email_open_rate = Math.round(emailOpenedCount.count / trackedEmailCount * 100);
        }

        await db.knex('members')
            .update(updateQuery)
            .where('id', memberId);
    }
};