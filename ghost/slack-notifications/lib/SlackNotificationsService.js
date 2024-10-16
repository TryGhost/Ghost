const {MilestoneCreatedEvent} = require('@tryghost/milestones');

/**
 * @typedef {import('@tryghost/milestones/lib/InMemoryMilestoneRepository').Milestone} Milestone
 */

/**
 * @typedef {object} meta
 * @prop {'import'|'email'} [reason]
 * @prop {number} [currentValue]
 */

/**
 * @typedef {import('@tryghost/logging')} logging
 */

/**
 * @typedef {object} ISlackNotifications
 * @param {logging} logging
 * @param {URL} siteUrl
 * @param {URL} webhookUrl
 * @prop {Object.<Milestone, ?meta>} notifyMilestoneReceived
 * @prop {(slackData: object, url: URL) => Promise<void>} send
 */

/**
 * @typedef {object} config
 * @prop {boolean} isEnabled
 * @prop {URL} webhookUrl
 * @prop {number} minThreshold
 */

module.exports = class SlackNotificationsService {
    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /** @type {import('@tryghost/logging')} */
    #logging;

    /** @type {config} */
    #config;

    /** @type {ISlackNotifications} */
    #slackNotifications;

    /**
     *
     * @param {object} deps
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     * @param {config} deps.config
     * @param {import('@tryghost/logging')} deps.logging
     * @param {ISlackNotifications} deps.slackNotifications
     */
    constructor(deps) {
        this.#DomainEvents = deps.DomainEvents;
        this.#logging = deps.logging;
        this.#config = deps.config;
        this.#slackNotifications = deps.slackNotifications;
    }

    /**
     *
     * @param {MilestoneCreatedEvent} type
     * @param {object} event
     * @param {object} event.data
     *
     * @returns {Promise<void>}
     */
    async #handleEvent(type, event) {
        if (
            type === MilestoneCreatedEvent
            && event.data.milestone
            && this.#config.isEnabled
            && this.#config.webhookUrl
            && this.#config.minThreshold < event.data.milestone.value
        ) {
            try {
                await this.#slackNotifications.notifyMilestoneReceived(event.data);
            } catch (error) {
                this.#logging.error(error);
            }
        }
    }

    subscribeEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleEvent(MilestoneCreatedEvent, event);
        });
    }
};
