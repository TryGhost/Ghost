const path = require('path');
const moment = require('moment');
const config = require('../../../../shared/config');
const labs = require('../../../../shared/labs');
const models = require('../../../models');
const jobsService = require('../../jobs');

let hasScheduledNewsletter = false;
let hasScheduledAutomation = false;

function createRandomizedFiveMinuteCron() {
    // use a random seconds value to avoid spikes to external APIs on the minute
    const s = Math.floor(Math.random() * 60); // 0-59
    // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
    const m = Math.floor(Math.random() * 5); // 0-4

    return `${s} ${m}/5 * * * *`;
}

async function hasRecentNewsletterEmails(skipEmailCheck) {
    if (skipEmailCheck) {
        return true;
    }

    const emailCount = await models.Email
        .where('created_at', '>', moment.utc().subtract(30, 'days').toDate())
        .where('status', '<>', 'failed')
        .count();

    return emailCount > 0;
}

async function hasRecentAutomatedEmailRecipients() {
    const recipientCount = await models.AutomatedEmailRecipient
        .where('created_at', '>', moment.utc().subtract(30, 'days').toDate())
        .where('mailgun_message_id', 'is not', null)
        .count();

    return recipientCount > 0;
}

module.exports = {
    async scheduleRecurringJobs(skipEmailCheck = false) {
        if (
            config.get('emailAnalytics:enabled') &&
            config.get('backgroundJobs:emailAnalytics') &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            if (!hasScheduledNewsletter && await hasRecentNewsletterEmails(skipEmailCheck)) {
                jobsService.addJob({
                    at: createRandomizedFiveMinuteCron(),
                    job: path.resolve(__dirname, 'fetch-latest/index.js'),
                    name: 'email-analytics-fetch-latest'
                });

                hasScheduledNewsletter = true;
            }

            if (!hasScheduledAutomation && labs.isSet('automations') && await hasRecentAutomatedEmailRecipients()) {
                jobsService.addJob({
                    at: createRandomizedFiveMinuteCron(),
                    job: path.resolve(__dirname, 'automation-fetch-latest/index.js'),
                    name: 'email-analytics-automation-fetch-latest'
                });

                hasScheduledAutomation = true;
            }
        }

        return hasScheduledNewsletter || hasScheduledAutomation;
    }
};
