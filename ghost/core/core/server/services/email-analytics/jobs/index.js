const path = require('path');
const moment = require('moment');
const config = require('../../../../shared/config');
const models = require('../../../models');
const jobsService = require('../../jobs');

let hasScheduled = false;

module.exports = {
    async scheduleRecurringJobs() {
        if (
            !hasScheduled &&
            config.get('emailAnalytics') &&
            config.get('backgroundJobs:emailAnalytics') &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            // Don't register email analytics job if we have no emails,
            // processor usage from many sites spinning up threads can be high.
            // Mega service will re-run this scheduling task when an email is sent
            const emailCount = await models.Email
                .where('created_at', '>', moment.utc().subtract(30, 'days').toDate())
                .where('status', '<>', 'failed')
                .count();

            if (emailCount > 0) {
                // use a random seconds value to avoid spikes to external APIs on the minute
                const s = Math.floor(Math.random() * 60); // 0-59
                // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
                const m = Math.floor(Math.random() * 5); // 0-4

                jobsService.addJob({
                    at: `${s} ${m}/5 * * * *`,
                    job: path.resolve(__dirname, 'fetch-latest.js'),
                    name: 'email-analytics-fetch-latest'
                });

                hasScheduled = true;
            }
        }

        return hasScheduled;
    }
};
