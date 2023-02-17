const {MilestoneCreatedEvent} = require('@tryghost/milestones');

/**
 * @typedef {import('@tryghost/milestones/lib/InMemoryMilestoneRepository').Milestone} Milestone
 */

/**
 * @typedef {object} meta
 * @prop {'import'|'email'} [reason]
 * @prop {number} [currentARR]
 * @prop {number} [currentMembers]
 */

/**
 * @typedef {object} ISlackNotifications
 * @prop {Object.<Milestone, ?meta>} notifyMilestoneReceived
 * @prop {(slackData: object, url: URL) => Promise<void>} send
 */

/**
 * @typedef {object} config
 * @property {boolean} isEnabled
 * @property {URL} webhookUrl
 */

/**
 * @typedef {string} siteUrl
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
     * @param {siteUrl} deps.siteUrl
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
