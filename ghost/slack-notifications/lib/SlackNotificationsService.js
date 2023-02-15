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
 * @prop {(string) => any} get
 */

/**
 * @typedef {object} urlUtils
 * @prop {() => any} getSiteUrl
 */

/**
 * @typedef {object} labs
 * @prop {(string) => boolean} isSet
 */

module.exports = class SlackNotificationsService {
    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /** @type {import('@tryghost/logging')} */
    #logging;

    /** @type {labs} */
    #labs;

    /** @type {config} */
    #config;

    /** @type {ISlackNotifications} */
    #notifications;

    /** @type {urlUtils} */
    #urlUtils;

    /**
     *
     * @param {object} deps
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     * @param {labs} deps.labs
     * @param {config} deps.config
     * @param {urlUtils} deps.urlUtils
     * @param {import('@tryghost/logging')} deps.logging
     */
    constructor(deps) {
        this.#DomainEvents = deps.DomainEvents;
        this.#logging = deps.logging;
        this.#labs = deps.labs;
        this.#config = deps.config;
        this.#urlUtils = deps.urlUtils;

        const SlackNotifications = require('./SlackNotifications');

        this.#notifications = new SlackNotifications({
            config: this.#config,
            urlUtils: this.#urlUtils,
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
            && this.#labs.isSet('milestoneEmails')
            && this.#config.get('hostSettings')?.milestones?.enabled
            && this.#config.get('hostSettings')?.milestones?.url
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
