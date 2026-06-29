const path = require('path');
const moment = require('moment');
const config = require('../../../../shared/config');
const models = require('../../../models');
const jobsService = require('../../jobs');

let hasScheduled = false;

const hasRecentEmailAnalyticsActivity = async () => {
    const since = moment.utc().subtract(30, 'days').toDate();
    const emailCount = await models.Email
        .where('created_at', '>', since)
        .where('status', '<>', 'failed')
        .count();

    if (Number(emailCount) > 0) {
        return true;
    }

    const automationEmailCount = await models.Base.knex('automated_email_recipients')
        .where('sent_at', '>', since)
        .count({count: 'id'})
        .first();

    return Number(automationEmailCount?.count || 0) > 0;
};

module.exports = {
    async scheduleRecurringJobs(skipEmailCheck = false) {
        if (
            !hasScheduled &&
            config.get('emailAnalytics:enabled') &&
            config.get('backgroundJobs:emailAnalytics') &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            // Don't register email analytics job if we have no emails,
            // processor usage from many sites spinning up threads can be high.
            // Email sending services re-run this scheduling task when an email is sent.
            const hasActivity = skipEmailCheck || await hasRecentEmailAnalyticsActivity();

            if (hasActivity) {
                // use a random seconds value to avoid spikes to external APIs on the minute
                const s = Math.floor(Math.random() * 60); // 0-59
                // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
                const m = Math.floor(Math.random() * 5); // 0-4

                jobsService.addJob({
                    at: `${s} ${m}/5 * * * *`,
                    job: path.resolve(__dirname, 'fetch-latest/index.js'),
                    name: 'email-analytics-fetch-latest'
                });

                hasScheduled = true;
            }
        }

        return hasScheduled;
    }
};
