const {MilestoneCreatedEvent} = require('@tryghost/milestones');

/**
 * @typedef {import('@tryghost/milestones/lib/InMemoryMilestoneRepository').Milestone} Milestone
 */

/**
 * @typedef {object} ISlackNotifications
 * @prop {(milestone: Milestone) => Promise<void>} notifyMilestoneReceived
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
    #notifications;

    /** @type {siteUrl} */
    #siteUrl;

    /**
     *
     * @param {object} deps
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     * @param {config} deps.config
     * @param {siteUrl} deps.siteUrl
     * @param {import('@tryghost/logging')} deps.logging
     */
    constructor(deps) {
        this.#DomainEvents = deps.DomainEvents;
        this.#logging = deps.logging;
        this.#config = deps.config;
        this.#siteUrl = deps.siteUrl;

        const SlackNotifications = require('./SlackNotifications');

        this.#notifications = new SlackNotifications({
            config: this.#config,
            siteUrl: this.#siteUrl,
            logging: this.#logging
        });
    }

    /**
     *
     * @param {MilestoneCreatedEvent} type
     * @param {object} event
     * @param {object} event.data
     *
     * @returns {Promise<void>}
     */
    async handleEvent(type, event) {
        if (
            type === MilestoneCreatedEvent
            && event.data.milestone
            && this.#config.isEnabled
            && this.#config.webhookUrl
        ) {
            await this.#notifications.notifyMilestoneReceived(event.data.milestone);
        }
    }

    subscribeEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            try {
                await this.handleEvent(MilestoneCreatedEvent, event);
            } catch (e) {
                this.#logging.error(e, `Failed to notify Milestone created event - ${event?.data?.milestone?.id}`);
            }
        });
    }
};
