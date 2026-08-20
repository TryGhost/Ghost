
const api = require('../../api').endpoints;
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;

const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const UpdateCheckService = require('./update-check-service');
const {NotificationEmailService} = require('../notifications/notification-email');
const UpdateCheckJob = require('./update-check-job').default;

/**
 * Initializes and triggers update check
 * @param {Object} [options]
 * @param {boolean} [options.rethrowErrors] - if true, errors will be thrown instead of logged
 * @param {boolean} [options.forceUpdate] - if true, the update check will be triggered regardless of the environment or scheudle, defaults to config if no value provided
 * @param {string} [options.updateCheckUrl] - the url to check for updates against, defaults to config if no value provided
 * @returns {Promise<import('./update-check-service').UpdateCheckSummary | {checked: false, reason: 'environment'}>}
 */
module.exports = async ({
    rethrowErrors = false,
    forceUpdate = config.get('updateCheck:forceUpdate'),
    updateCheckUrl = config.get('updateCheck:url')
} = {}) => {
    if (!forceUpdate) {
        // CASE: The check will not happen if your env is not in the allowed defined environments
        if (!config.isProductionOrDevelopment()) {
            return {checked: false, reason: 'environment'};
        }
    }

    const mailService = require('../mail');
    const ghostMailer = new mailService.GhostMailer();

    const notificationEmailService = new NotificationEmailService({
        mailer: ghostMailer,
        generateEmailContent: mailService.utils.generateContent,
        getSiteUrl: () => urlUtils.urlFor('home', true)
    });

    const updateChecker = new UpdateCheckService({
        api: {
            settings: {
                read: api.settings.read,
                edit: api.settings.edit
            },
            users: {
                browse: api.users.browse
            },
            notifications: {
                add: api.notifications.add
            }
        },
        config: {
            checkEndpoint: updateCheckUrl,
            notificationGroups: config.get('notificationGroups'),
            siteUrl: urlUtils.urlFor('home', true),
            forceUpdate,
            ghostVersion: ghostVersion.original,
            rethrowErrors
        },
        request,
        notificationEmailService
    });

    return updateChecker.check();
};

let hasScheduled = false;

function randomDailyCron() {
    // use a random seconds/minutes/hours value to avoid spikes to the update service API
    const s = Math.floor(Math.random() * 60); // 0-59
    const m = Math.floor(Math.random() * 60); // 0-59
    const h = Math.floor(Math.random() * 24); // 0-23

    return `${s} ${m} ${h} * * *`; // Every day
}

/**
 * Starts the update check's background jobs.
 *
 * Boot decides when this runs; which jobs it starts - and whether the forced
 * one-off run happens at all - is decided here, next to the config it reads.
 */
module.exports.scheduleJobs = async () => {
    const jobs = () => require('../jobs-service').getInstance();

    if (!hasScheduled && !process.env.NODE_ENV.startsWith('test')) {
        await jobs().scheduleRecurring(new UpdateCheckJob(), {cron: randomDailyCron()});
        hasScheduled = true;
    }

    // A forced check runs once immediately, on top of the daily schedule
    if (config.get('updateCheck:forceUpdate')) {
        await jobs().dispatch(new UpdateCheckJob());
    }
};
