const Analytics = require('analytics-node');
const config = require('../../../shared/config');
const sentry = require('../../../shared/sentry');
const logging = require('@tryghost/logging');
const DomainEvents = require('@tryghost/domain-events');

const DomainEventsAnalytics = require('./DomainEventsAnalytics');

module.exports.init = function () {
    const analytics = new Analytics(config.get('segment:key'));
    const trackDefaults = config.get('segment:trackDefaults') || {};
    const prefix = config.get('segment:prefix') || '';

    const subscribeToDomainEvents = new DomainEventsAnalytics({
        analytics,
        trackDefaults,
        prefix,
        exceptionHandler: sentry,
        DomainEvents,
        logging
    });

    // Listen to domain events
    subscribeToDomainEvents.subscribeToEvents();
};
