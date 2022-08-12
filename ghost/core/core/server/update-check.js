const _ = require('lodash');

const api = require('./api');
const config = require('../shared/config');
const urlUtils = require('./../shared/url-utils');
const jobsService = require('./services/jobs');
const databaseInfo = require('./data/db/info');

const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const UpdateCheckService = require('@tryghost/update-check-service');

/**
 * Initializes and triggers update check
 *
 * @returns {Promise<any>}
 */
module.exports = async () => {
    const allowedCheckEnvironments = ['development', 'production'];

    // CASE: The check will not happen if your NODE_ENV is not in the allowed defined environments.
    if (_.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        return;
    }

    const {GhostMailer} = require('./services/mail');
    const ghostMailer = new GhostMailer();

    const updateChecker = new UpdateCheckService({
        api: {
            settings: {
                read: api.settings.read,
                edit: api.settings.edit
            },
            posts: {
                browse: api.posts.browse
            },
            users: {
                browse: api.users.browse
            },
            notifications: {
                add: api.notifications.add
            }
        },
        config: {
            mail: config.get('mail'),
            env: config.get('env'),
            databaseType: databaseInfo.getEngine(),
            checkEndpoint: config.get('updateCheck:url'),
            isPrivacyDisabled: config.isPrivacyDisabled('useUpdateCheck'),
            notificationGroups: config.get('notificationGroups'),
            siteUrl: urlUtils.urlFor('home', true),
            forceUpdate: config.get('updateCheck:forceUpdate'),
            ghostVersion: ghostVersion.original
        },
        request,
        sendEmail: ghostMailer.send.bind(ghostMailer)
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
