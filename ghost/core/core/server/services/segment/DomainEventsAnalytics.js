const {MilestoneCreatedEvent} = require('@tryghost/milestones');
const {StripeLiveEnabledEvent, StripeLiveDisabledEvent} = require('@tryghost/members-stripe-service').events;

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
 * @typedef {import('@tryghost/domain-events')} DomainEvents
 */

/**
 * @typedef {object} IDomainEventsAnalytics
 * @param {analytics} analytics
 * @param {logging} logging
 * @param {object} trackDefaults
 * @param {string} prefix
 * @param {IExceptionHandler} exceptionHandler
 * @param {DomainEvents} DomainEvents
 * @prop {} subscribeToEvents
 */

module.exports = class DomainEventsAnalytics {
    /** @type {analytics} */
    #analytics;
    /** @type {object} */
    #trackDefaults;
    /** @type {string} */
    #prefix;
    /** @type {IExceptionHandler} */
    #exceptionHandler;
    /** @type {logging} */
    #logging;
    /** @type {DomainEvents} */
    #DomainEvents;

    constructor(deps) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#exceptionHandler = deps.exceptionHandler;
        this.#logging = deps.logging;
        this.#DomainEvents = deps.DomainEvents;
    }

    /**
     *
     * @param {object} event
     * @param {object} event.data
     * @param {object} event.data.milestone
     * @param {number} event.data.milestone.value
     * @param {string} event.data.milestone.type
     * @returns {Promise<void>}
     */
    async #handleMilestoneCreatedEvent(event) {
        if (event.data.milestone
            && event.data.milestone.value === 100
        ) {
            const eventName = event.data.milestone.type === 'arr' ? '$100 ARR reached' : '100 Members reached';

            try {
                this.#analytics.track(Object.assign(this.#trackDefaults, {}, {event: this.#prefix + eventName}));
            } catch (err) {
                this.#logging.error(err);
                this.#exceptionHandler.captureException(err);
            }
        }
    }

    /**
     *
     * @param {StripeLiveEnabledEvent|StripeLiveDisabledEvent} type
     *
     * @returns {Promise<void>}
     */
    async #handleStripeEvent(type) {
        const eventName = type === StripeLiveDisabledEvent ? 'Stripe Live Disabled' : 'Stripe Live Enabled';

        try {
            this.#analytics.track(Object.assign(this.#trackDefaults, {}, {event: this.#prefix + eventName}));
        } catch (err) {
            this.#logging.error(err);
            this.#exceptionHandler.captureException(err);
        }
    }

    subscribeToEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleMilestoneCreatedEvent(event);
        });

        this.#DomainEvents.subscribe(StripeLiveEnabledEvent, async () => {
            await this.#handleStripeEvent(StripeLiveEnabledEvent);
        });

        this.#DomainEvents.subscribe(StripeLiveDisabledEvent, async () => {
            await this.#handleStripeEvent(StripeLiveDisabledEvent);
        });
    }
};
