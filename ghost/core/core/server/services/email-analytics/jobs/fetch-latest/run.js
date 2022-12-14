const debug = require('@tryghost/debug')('jobs:email-analytics:fetch-latest');

async function run({domainEvents}) {
    const config = require('../../../../../shared/config');
    const db = require('../../../../data/db');

    const settingsRows = await db.knex('settings')
        .whereIn('key', ['mailgun_api_key', 'mailgun_domain', 'mailgun_base_url']);

    const settingsCache = {};

    settingsRows.forEach((row) => {
        settingsCache[row.key] = row.value;
    });

    const settings = {
        get(key) {
            return settingsCache[key];
        }
    };

    const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
    const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
    const queries = require('../../lib/queries');
    const {EmailEventProcessor} = require('@tryghost/email-service');

    // Since this is running in a worker thread, we cant dispatch directly
    // So we post the events as a message to the job manager
    const eventProcessor = new EmailEventProcessor({
        domainEvents,
        db
    });

    const emailAnalyticsService = new EmailAnalyticsService({
        config,
        settings,
        eventProcessor,
        providers: [
            new MailgunProvider({config, settings})
        ],
        queries
    });

    const fetchStartDate = new Date();
    debug('Starting email analytics fetch of latest events');
    const eventStats = await emailAnalyticsService.fetchLatest();
    const fetchEndDate = new Date();
    debug(`Finished fetching ${eventStats.totalEvents} analytics events in ${fetchEndDate - fetchStartDate}ms`);

    const aggregateStartDate = new Date();
    debug(`Starting email analytics aggregation for ${eventStats.emailIds.length} emails`);
    await emailAnalyticsService.aggregateStats(eventStats);
    const aggregateEndDate = new Date();
    debug(`Finished aggregating email analytics in ${aggregateEndDate - aggregateStartDate}ms`);
    return {eventStats, fetchStartDate, fetchEndDate, aggregateStartDate, aggregateEndDate};
}
module.exports.run = run;
