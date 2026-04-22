/**
 * @typedef {import('./milestone')} Milestone
 * @typedef {import('./milestones-service').IMilestoneRepository} IMilestoneRepository
 */

/**
 * @implements {IMilestoneRepository}
 */
module.exports = class InMemoryMilestoneRepository {
    /** @type {Milestone[]} */
    #store = [];

    /** @type {Object.<string, true>} */
    #ids = {};

    /** @type {import('@tryghost/domain-events')} */
    #DomainEvents;

    /**
     * @param {object} deps
     * @param {import('@tryghost/domain-events')} deps.DomainEvents
     */
    constructor(deps) {
        this.#DomainEvents = deps.DomainEvents;
    }

    /**
     * @param {Milestone} milestone
     *
     * @returns {Promise<void>}
     */
    async save(milestone) {
        if (this.#ids[milestone.id.toHexString()]) {
            const existingIndex = this.#store.findIndex((item) => {
                return item.id.equals(milestone.id);
            });
            this.#store.splice(existingIndex, 1, milestone);
        } else {
            this.#store.push(milestone);
            this.#ids[milestone.id.toHexString()] = true;
        }

        for (const event of milestone.events) {
            this.#DomainEvents.dispatch(event);
        }
    }

    /**
     * @param {'arr'|'members'} type
     * @param {string} [currency]
     *
     * @returns {Promise<Milestone>}
     */
    async getLatestByType(type, currency = 'usd') {
        const allMilestonesForType = await this.getAllByType(type, currency);
        return allMilestonesForType?.[0];
    }

    /**
     * @returns {Promise<Milestone>}
     */
    async getLastEmailSent() {
        return this.#store
            .filter(item => item.emailSentAt)
            // sort by emailSentAt desc
            .sort((a, b) => (b.emailSentAt.valueOf() - a.emailSentAt.valueOf()))
            // if we end up with more values with the same datetime, pick the highest value
            .sort((a, b) => b.value - a.value)[0];
    }

    /**
     * @param {number} value
     * @param {string} [currency]
     *
     * @returns {Promise<Milestone>}
     */
    async getByARR(value, currency = 'usd') {
        // find a milestone of the ARR type by a given value
        return this.#store.find((item) => {
            return item.value === value && item.type === 'arr' && item.currency === currency;
        });
    }

    /**
     * @param {number} value
     *
     * @returns {Promise<Milestone>}
     */
    async getByCount(value) {
        // find a milestone of the members type by a given value
        return this.#store.find((item) => {
            return item.value === value && item.type === 'members';
        });
    }

    /**
     * @param {'arr'|'members'} type
     * @param {string} [currency]
     *
     * @returns {Promise<Milestone[]>}
     */
    async getAllByType(type, currency = 'usd') {
        if (type === 'arr') {
            return this.#store
                .filter(item => item.type === type && item.currency === currency)
                // sort by created at desc
                .sort((a, b) => (b.createdAt.valueOf() - a.createdAt.valueOf()))
                // sort by highest value
                .sort((a, b) => b.value - a.value);
        } else {
            return this.#store
                .filter(item => item.type === type)
                // sort by created at desc
                .sort((a, b) => (b.createdAt.valueOf() - a.createdAt.valueOf()))
                // sort by highest value
                .sort((a, b) => b.value - a.value);
        }
    }
};
