const Analytics = require('analytics-node');
const config = require('../../../shared/config');
const sentry = require('../../../shared/sentry');

const ModelEventsAnalytics = require('./ModelEventsAnalytics');
const DomainEventsAnalytics = require('./DomainEventsAnalytics');

module.exports.init = function () {
    const analytics = new Analytics(config.get('segment:key'));
    const trackDefaults = config.get('segment:trackDefaults') || {};
    const prefix = config.get('segment:prefix') || '';

    const subscribeToDomainEvents = new DomainEventsAnalytics({
        analytics,
        trackDefaults,
        prefix,
        sentry
    });

    const modelEventsAnalytics = new ModelEventsAnalytics({
        analytics,
        trackDefaults,
        prefix,
        sentry
    });

    // Listen to model events
    modelEventsAnalytics.subscribeToModelEvents();

    // Listen to domain events
    subscribeToDomainEvents.subscribeToDomainEvents();
};
