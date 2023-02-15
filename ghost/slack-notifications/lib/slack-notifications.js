// const got = require('got');
// const validator = require('@tryghost/validator');
// const errors = require('@tryghost/errors');
// const ghostVersion = require('@tryghost/version');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

module.exports = class SlackNotifications {
    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /** @type {import('@tryghost/logging')} */
    #logging;

    /** @type {object} */
    #settingsCache;

    /** @type {object} */
    #labs;

    /** @type {object} */
    #config;

    constructor(deps) {
        this.#DomainEvents = deps.DomainEvents;
        this.#logging = deps.logging;
        this.#settingsCache = deps.settingsCache;
        this.#labs = deps.labs;
        this.#config = deps.config;
    }

    handleEvent(data, event) {
        // TODO
    }

    subscribeEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            try {
                await this.handleEvent(MilestoneCreatedEvent, event);
            } catch (e) {
                this.#logging.error(e, `Failed to notify Milestone created event - ${event?.data?.milstoneId}`);
            }
        });
    }
};
