const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const db = require('../../data/db');
const settings = require('../settings/cache');
const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
const EventProcessor = require('./lib/event-processor');
const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
const queries = require('./lib/queries');

module.exports = new EmailAnalyticsService({
    config,
    logging,
    settings,
    eventProcessor: new EventProcessor({db, logging}),
    providers: [
        new MailgunProvider({config, settings, logging})
    ],
    queries
});
