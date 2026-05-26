const api = require('../../api').endpoints;
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const jobsService = require('../jobs');
const ghostVersion = require('@tryghost/version');
const {SecurityAdvisoriesService} = require('./security-advisories-service');

/**
 * Run a single check against the GitHub Security Advisory feed.
 *
 * @param {Object} [options]
 * @param {string} [options.endpoint]
 * @returns {Promise<void>}
 */
module.exports = async ({endpoint} = {}) => {
    const service = new SecurityAdvisoriesService({
        notifications: {
            add: api.notifications.add
        },
        ghostVersion: ghostVersion.original,
        siteUrl: urlUtils.urlFor('home', true),
        endpoint: endpoint || config.get('securityAdvisories:url')
    });

    await service.check();
};

module.exports.scheduleRecurringJobs = () => {
    // Random second/minute keeps thundering-herd off the GitHub API across
    // the install base. Hourly cadence — security advisories should reach
    // admins within an hour of publication.
    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);

    jobsService.addJob({
        at: `${s} ${m} * * * *`,
        job: require('path').resolve(__dirname, 'run-feed-check.js'),
        name: 'security-advisories'
    });
};
