
const api = require('../../api').endpoints;
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const jobsService = require('../jobs');

const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const UpdateCheckService = require('./update-check-service');
const {NotificationEmailService} = require('../notifications/notification-email');

/**
 * Initializes and triggers update check
 * @param {Object} [options]
 * @param {boolean} [options.rethrowErrors] - if true, errors will be thrown instead of logged
 * @param {boolean} [options.forceUpdate] - if true, the update check will be triggered regardless of the environment or scheudle, defaults to config if no value provided
 * @param {string} [options.updateCheckUrl] - the url to check for updates against, defaults to config if no value provided
 * @returns {Promise<any>}
 */
module.exports = async ({
    rethrowErrors = false,
    forceUpdate = config.get('updateCheck:forceUpdate'),
    updateCheckUrl = config.get('updateCheck:url')
} = {}) => {
    if (!forceUpdate) {
        // CASE: The check will not happen if your env is not in the allowed defined environments
        if (!config.isProductionOrDevelopment()) {
            return;
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

    await updateChecker.check();
};

module.exports.scheduleRecurringJobs = () => {
    // use a random seconds/minutes/hours value to avoid spikes to the update service API
    const s = Math.floor(Math.random() * 60); // 0-59
    const m = Math.floor(Math.random() * 60); // 0-59
    const h = Math.floor(Math.random() * 24); // 0-23

    jobsService.addJob({
        at: `${s} ${m} ${h} * * *`, // Every day
        job: require('path').resolve(__dirname, 'run-update-check.js'),
        name: 'update-check'
    });
};

module.exports.scheduleBootJob = () => {
    jobsService.addJob({
        job: require('path').resolve(__dirname, 'run-update-check.js'),
        name: 'update-check-boot'
    });
};
