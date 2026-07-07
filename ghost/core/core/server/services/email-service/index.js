const createFacade = require('../../../shared/container/create-facade');
const EmailServiceWrapper = require('./email-service-wrapper');

module.exports = createFacade('emailService', () => {
    const config = require('../../../shared/config');
    return new EmailServiceWrapper({
        models: require('../../models'),
        events: require('../../lib/common/events'),
        settingsCache: require('../../../shared/settings-cache'),
        settingsHelpers: require('../settings-helpers'),
        urlUtils: require('../../../shared/url-utils'),
        limits: require('../limits'),
        emailAddress: require('../email-address'),
        memberAttribution: require('../member-attribution'),
        linkTracking: require('../link-tracking'),
        audienceFeedback: require('../audience-feedback'),
        knex: require('../../data/db').knex,
        urlService: require('../url'),
        jobsService: require('../jobs'),
        membersService: require('../members'),
        labs: require('../../../shared/labs'),
        deploymentConfig: config,
        siteConfig: {dataContentPath: config.getContentPath('data')}
    });
});
