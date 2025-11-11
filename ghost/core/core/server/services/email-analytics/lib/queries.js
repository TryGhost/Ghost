const _ = require('lodash');
const debug = require('@tryghost/debug')('services:email-analytics');
const db = require('../../../data/db');
const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');

const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

/**
 * Helper to build a CASE statement for batch updates
 * @param {string} column - Column name to update
 * @param {string} idColumn - ID column name for CASE matching
 * @param {Map<string, any>} valueMap - Map of id -> value to set
 * @returns {{sql: string, bindings: any[]}} CASE SQL and parameter bindings
 */
function buildCaseUpdate(column, idColumn, valueMap) {
    const cases = [];
    const bindings = [];

    for (const [id, value] of valueMap.entries()) {
        if (value !== undefined && value !== null) {
            cases.push(`WHEN ? THEN ?`);
            bindings.push(id, value);
        } else {
            // Keep existing value - use column reference
            cases.push(`WHEN ? THEN ${column}`);
            bindings.push(id);
        }
    }

    return {
        sql: `${column} = CASE ${idColumn} ${cases.join(' ')} END`,
        bindings
    };
}

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
        logging.info(`[EmailAnalytics] getLastEventTimestamp: Starting for job ${jobName}, events: ${events.join(',')}`);
        
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
            const queryStart = Date.now();
            if (events.includes('opened')) {
                maxOpenedAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(opened_at) as maxOpenedAt')).first()).maxOpenedAt;
            }
            if (events.includes('delivered')) {
                maxDeliveredAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(delivered_at) as maxDeliveredAt')).first()).maxDeliveredAt;
            }
            if (events.includes('failed')) {
                maxFailedAt = (await db.knex('email_recipients').select(db.knex.raw('MAX(failed_at) as maxFailedAt')).first()).maxFailedAt;
            }
            const queryDuration = Date.now() - queryStart;
            logging.info(`[EmailAnalytics] getLastEventTimestamp: Queries completed in ${queryDuration}ms`);

            await createJobIfNotExists(jobName);
        }

        // Convert string dates to Date objects for SQLite compatibility
        [maxOpenedAt, maxDeliveredAt, maxFailedAt] = [maxOpenedAt, maxDeliveredAt, maxFailedAt].map(date => (
            date && !(date instanceof Date) ? new Date(date) : date
        ));

        const lastSeenEventTimestamp = _.max([maxOpenedAt, maxDeliveredAt, maxFailedAt]);
        debug(`getLastEventTimestamp: finished in ${Date.now() - startDate}ms`);
        logging.info(`[EmailAnalytics] getLastEventTimestamp: Completed in ${Date.now() - startDate}ms, timestamp: ${lastSeenEventTimestamp}`);

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
     * @param {'finished'|'started'} field - The field to update.
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
            const updateField = field === 'finished' ? 'finished_at' : 'started_at';
            const status = field === 'finished' ? 'finished' : 'started';
            const result = await db.knex('jobs').update({[updateField]: date, updated_at: new Date(), status: status}).where('name', jobName);
            if (result === 0) {
                await db.knex('jobs').insert({
                    id: new ObjectID().toHexString(),
                    name: jobName,
                    [updateField]: date.toISOString(), // force to iso string for sqlite
                    updated_at: date.toISOString(), // force to iso string for sqlite
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
        const queryStart = Date.now();
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

        const updateStart = Date.now();
        await db.knex('emails').update(updateData).where('id', emailId);
        const queryDuration = Date.now() - queryStart;
        const updateDuration = Date.now() - updateStart;

        logging.info(`[EmailAnalytics] aggregateEmailStats: emailId=${emailId}, counts: delivered=${updateData.delivered_count}, failed=${updateData.failed_count}, opened=${updateData.opened_count || 'N/A'}, total=${queryDuration}ms (update: ${updateDuration}ms)`);
    },

    /**
     * Aggregate email stats for multiple emails in a batch
     * Processes multiple emails at once using optimized batch queries
     * @param {string[]} emailIds - Array of email IDs to aggregate stats for
     * @param {boolean} updateOpenedCount - Whether to update opened counts
     * @returns {Promise<Object>} Timing information
     */
    async aggregateEmailStatsBatch(emailIds, updateOpenedCount) {
        const timings = {total: Date.now(), emailCount: emailIds.length};

        if (emailIds.length > 0) {
            logging.info(`[EmailAnalytics] aggregateEmailStatsBatch: Starting batch for ${emailIds.length} emails`);
        }

        await db.knex.transaction(async (trx) => {

            // Step 1: Query for aggregated stats from email_recipients
            timings.select = Date.now();

            const selectCols = [
                'email_id',
                db.knex.raw('SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) as delivered_count'),
                db.knex.raw('SUM(CASE WHEN failed_at IS NOT NULL THEN 1 ELSE 0 END) as failed_count')
            ];

            if (updateOpenedCount) {
                selectCols.push(db.knex.raw('SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened_count'));
            }

            const stats = await trx('email_recipients')
                .select(...selectCols)
                .whereIn('email_id', emailIds)
                .groupBy('email_id');

            timings.select = Date.now() - timings.select;

            // Step 2: Build maps of id -> value for each column
            const deliveredMap = new Map();
            const failedMap = new Map();
            const openedMap = new Map();

            for (const emailId of emailIds) {
                const emailStats = stats.find(s => s.email_id === emailId);
                deliveredMap.set(emailId, emailStats ? emailStats.delivered_count : 0);
                failedMap.set(emailId, emailStats ? emailStats.failed_count : 0);
                if (updateOpenedCount) {
                    openedMap.set(emailId, emailStats ? emailStats.opened_count : 0);
                }
            }

            // Step 3: Build CASE statements for each column
            const deliveredCase = buildCaseUpdate('delivered_count', 'id', deliveredMap);
            const failedCase = buildCaseUpdate('failed_count', 'id', failedMap);

            const setClauses = [deliveredCase.sql, failedCase.sql];
            const bindings = [...deliveredCase.bindings, ...failedCase.bindings];

            if (updateOpenedCount) {
                const openedCase = buildCaseUpdate('opened_count', 'id', openedMap);
                setClauses.push(openedCase.sql);
                bindings.push(...openedCase.bindings);
            }

            // Step 4: Execute batch update
            bindings.push(...emailIds); // Add IDs for WHERE IN clause

            timings.update = Date.now();
            await trx.raw(`
                UPDATE emails
                SET ${setClauses.join(', ')}
                WHERE id IN (${emailIds.map(() => '?').join(',')})
            `, bindings);
            timings.update = Date.now() - timings.update;
        });

        timings.total = Date.now() - timings.total;
        if (emailIds.length > 0) {
            logging.info(`[EmailAnalytics] aggregateEmailStatsBatch: Completed in ${timings.total}ms (select: ${timings.select}ms, update: ${timings.update}ms)`);
        }

        return timings;
    },

    /**
     * Aggregate member stats for multiple members in a batch
     * Processes 100 members at a time using optimized batch queries
     * @param {string[]} memberIds - Array of member IDs to aggregate stats for
     * @returns {Promise<Object>} Timing information
     */
    async aggregateMemberStatsBatch(memberIds) {
        const timings = {total: Date.now(), memberCount: memberIds.length};

        await db.knex.transaction(async (trx) => {

            // Step 1: Query for aggregated stats from email_recipients + emails
            timings.select = Date.now();

            const stats = await trx('email_recipients')
                .leftJoin('emails', 'emails.id', 'email_recipients.email_id')
                .select(
                    'email_recipients.member_id',
                    db.knex.raw('COUNT(email_recipients.id) as email_count'),
                    db.knex.raw('SUM(CASE WHEN email_recipients.opened_at IS NOT NULL THEN 1 ELSE 0 END) as email_opened_count'),
                    db.knex.raw('SUM(CASE WHEN emails.track_opens = 1 THEN 1 ELSE 0 END) as tracked_count')
                )
                .whereIn('email_recipients.member_id', memberIds)
                .groupBy('email_recipients.member_id');

            timings.select = Date.now() - timings.select;

            // Step 2: Build maps of id -> value for each column
            const emailCountMap = new Map();
            const emailOpenedCountMap = new Map();
            const emailOpenRateMap = new Map();

            for (const memberId of memberIds) {
                const memberStats = stats.find(s => s.member_id === memberId);

                if (memberStats) {
                    emailCountMap.set(memberId, memberStats.email_count);
                    emailOpenedCountMap.set(memberId, memberStats.email_opened_count);

                    // Only update open rate if we have enough tracked emails
                    const trackedCount = memberStats.tracked_count || 0;
                    if (trackedCount >= MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
                        const openRate = Math.round((memberStats.email_opened_count / trackedCount) * 100);
                        emailOpenRateMap.set(memberId, openRate);
                    } else {
                        // Keep existing open rate (undefined = no update)
                        emailOpenRateMap.set(memberId, undefined);
                    }
                } else {
                    // Member has no email stats yet
                    emailCountMap.set(memberId, 0);
                    emailOpenedCountMap.set(memberId, 0);
                    emailOpenRateMap.set(memberId, undefined); // Keep existing rate
                }
            }

            // Step 3: Build CASE statements for each column
            const emailCountCase = buildCaseUpdate('email_count', 'id', emailCountMap);
            const emailOpenedCountCase = buildCaseUpdate('email_opened_count', 'id', emailOpenedCountMap);
            const emailOpenRateCase = buildCaseUpdate('email_open_rate', 'id', emailOpenRateMap);

            const setClauses = [
                emailCountCase.sql,
                emailOpenedCountCase.sql,
                emailOpenRateCase.sql
            ];

            const bindings = [
                ...emailCountCase.bindings,
                ...emailOpenedCountCase.bindings,
                ...emailOpenRateCase.bindings
            ];

            // Step 4: Execute batch update
            bindings.push(...memberIds); // Add IDs for WHERE IN clause

            timings.update = Date.now();
            await trx.raw(`
                UPDATE members
                SET ${setClauses.join(', ')}
                WHERE id IN (${memberIds.map(() => '?').join(',')})
            `, bindings);
            timings.update = Date.now() - timings.update;
        });

        timings.total = Date.now() - timings.total;

        return timings;
    }
};