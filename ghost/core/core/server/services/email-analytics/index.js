const config = require('../../../shared/config');
const db = require('../../data/db');
const settings = require('../../../shared/settings-cache');
const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
const EventProcessor = require('./lib/event-processor');
const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
const queries = require('./lib/queries');

module.exports = new EmailAnalyticsService({
    config,
    settings,
    eventProcessor: new EventProcessor({db}),
    providers: [
        new MailgunProvider({config, settings})
    ],
    queries
});
