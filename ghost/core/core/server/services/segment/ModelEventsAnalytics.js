const _ = require('lodash');
const logging = require('@tryghost/logging');
// Listens to model events to layer on analytics - also uses the "fake" theme.uploaded event from the theme API
const events = require('../../lib/common/events');

const TO_TRACK = [
    {
        event: 'post.published',
        name: 'Post Published'
    },
    {
        event: 'page.published',
        name: 'Page Published'
    },
    {
        event: 'theme.uploaded',
        name: 'Theme Uploaded',
        // {keyOnSuppliedEventData: keyOnTrackedEventData}
        // - used to extract specific properties from event data and give them meaningful names
        data: {name: 'name'}
    },
    {
        event: 'integration.added',
        name: 'Custom Integration Added'
    },
    {
        event: 'settings.edited',
        name: 'Stripe enabled',
        data: {key: 'key', value: 'value'}
    }
];

module.exports = class ModelEventsAnalytics {
    #analytics;
    #trackDefaults;
    #prefix;
    #sentry;
    #toTrack;

    constructor(deps) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#sentry = deps.sentry;
        this.#toTrack = TO_TRACK;
    }

    subscribeToModelEvents() {
        this.#toTrack.forEach(({event, name, data = {}}) => {
            events.on(event, function (eventData = {}) {
                // extract desired properties from eventData and rename keys if necessary
                const mappedData = _.mapValues(data || {}, v => eventData[v]);

                try {
                    this.#analytics.track(_.extend(this.#trackDefaults, mappedData, {event: this.#prefix + name}));
                } catch (err) {
                    logging.error(err);
                    this.#sentry.captureException(err);
                }
            });
        });
    }
};
