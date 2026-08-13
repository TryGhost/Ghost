const MailgunClient = require('../lib/mailgun-client');

const DEFAULT_EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;

/**
 * Fetch Mailgun email analytics events.
 *
 * @param {object} options
 * @param {object} options.config
 * @param {object} options.settings
 * @param {string[]} options.tags
 * @param {Function} options.batchHandler
 * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
 * @param {Date} [options.begin]
 * @param {Date} [options.end]
 * @param {string[]} [options.events]
 */
async function fetchMailgunEvents({config, settings, tags, batchHandler, maxEvents, begin, end, events}) {
    const mailgunClient = new MailgunClient({config, settings});
    const mailgunOptions = {
        limit: PAGE_LIMIT,
        event: events ? events.join(' OR ') : DEFAULT_EVENT_FILTER,
        tags: tags.join(' AND '),
        begin: begin ? begin.getTime() / 1000 : undefined,
        end: end ? end.getTime() / 1000 : undefined,
        ascending: 'yes'
    };
    return await mailgunClient.fetchEvents(mailgunOptions, batchHandler, {maxEvents});
}

module.exports.fetchMailgunEvents = fetchMailgunEvents;
