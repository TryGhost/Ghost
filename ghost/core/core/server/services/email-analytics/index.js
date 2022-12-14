const config = require('../../../shared/config');
const db = require('../../data/db');
const settings = require('../../../shared/settings-cache');
const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
const {EmailEventProcessor} = require('@tryghost/email-service');
const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
const queries = require('./lib/queries');
const DomainEvents = require('@tryghost/domain-events');

const eventProcessor = new EmailEventProcessor({
    domainEvents: DomainEvents,
    db
});

module.exports = new EmailAnalyticsService({
    config,
    settings,
    eventProcessor,
    providers: [
        new MailgunProvider({config, settings})
    ],
    queries
});
