/**
 * @typedef {import('./Milestone')} Milestone
 */
/**
 * @template Model
 * @typedef {import('./MilestonesAPI')<Model>} <Model>
 */

/**
 * @implements {IMilestoneRepository}
 */
module.exports = class InMemoryMilestoneRepository {
    /** @type {Milestone[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

    /**
     * @param {Milestone} milestone
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
    }

    /**
     * @param {'arr'|'members'} type
     * @returns {Promise<Milestone>}
     */
    async getLatestByType(type) {
        return this.#store
            .filter(item => item.type === type)
            .sort((a, b) => ((a.createdAt > b.createdAt) ? -1 : ((a.createdAt < b.createdAt) ? 1 : 0)))[0];
    }

    /**
     * @returns {Promise<Milestone>}
     */
    async getLastEmailSent() {
        return this.#store
            .filter(item => item.emailSentAt)
            .sort((a, b) => ((a.emailSentAt > b.emailSentAt) ? -1 : ((a.emailSentAt < b.emailSentAt) ? 1 : 0)))[0];
    }

    /**
     * @param {number} value
     * @returns {Promise<Milestone>}
     */
    async getByARR(value) {
        // find a milestone of the ARR type by a given value
        return this.#store.find((item) => {
            return item.value === value && item.type === 'arr';
        });
    }

    /**
     * @param {number} value
     * @returns {Promise<Milestone>}
     */
    async getByCount(value) {
        // find a milestone of the members type by a given value
        return this.#store.find((item) => {
            return item.value === value && item.type === 'members';
        });
    }
};
