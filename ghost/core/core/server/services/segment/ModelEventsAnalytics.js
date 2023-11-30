const _ = require('lodash');

/**
 * @typedef {import('@tryghost/logging')} logging
 */

/**
 * @typedef {import('analytics-node')} analytics
 */

/**
 * @typedef {object} IExceptionHandler
 * @prop {(err: Error) => void} captureException
 */

/**
 * @typedef {import('../../lib/common/events')} events
 */

/**
 * @typedef {object} IModelEventsAnalytics
 * @param {analytics} analytics
 * @param {logging} logging
 * @param {object} trackDefaults
 * @param {string} prefix
 * @param {IExceptionHandler} exceptionHandler
 * @param {events} events
 * @prop {} subscribeToEvents
 */

/**
 * Listens to model events to layer on analytics - also uses the "fake" theme.uploaded
 * event from the theme API
 */
module.exports = class ModelEventsAnalytics {
    /** @type {analytics} */
    #analytics;
    /** @type {object} */
    #trackDefaults;
    /** @type {string} */
    #prefix;
    /** @type {IExceptionHandler} */
    #exceptionHandler;
    /** @type {events} */
    #events;
    /** @type {logging} */
    #logging;

    /**
     * @type {Array<{event: string, name: string, data?: object}>}
     */
    #toTrack = [
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
        }
    ];

    constructor(deps) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#exceptionHandler = deps.exceptionHandler;
        this.#events = deps.events;
        this.#logging = deps.logging;
    }

    async #handleEvent(event) {
        try {
            this.#analytics.track(event);
        } catch (err) {
            this.#logging.error(err);
            this.#exceptionHandler.captureException(err);
        }
    }

    subscribeToEvents() {
        this.#toTrack.forEach(({event, name, data = {}}) => {
            this.#events.on(event, async (eventData = {}) => {
                // extract desired properties from eventData and rename keys if necessary
                const mappedData = _.mapValues(data || {}, v => eventData[v]);

                const eventToTrack = {
                    ...this.#trackDefaults,
                    event: this.#prefix + name,
                    ...mappedData
                };

                await this.#handleEvent(eventToTrack);
            });
        });
    }
};
