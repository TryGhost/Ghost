const nql = require('@tryghost/nql');

/**
 * @typedef {import('./Tier')} Tier
 */

class InMemoryTierRepository {
    /** @type {Tier[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

    /**
     * @param {Tier} tier
     * @returns {any}
     */
    toPrimitive(tier) {
        return {
            ...tier,
            active: (tier.status === 'active'),
            type: tier.type,
            id: tier.id.toHexString()
        };
    }

    /**
     * @param {Tier} linkClick
     * @returns {Promise<void>}
     */
    async save(tier) {
        if (this.#ids[tier.id.toHexString()]) {
            const existing = this.#store.findIndex((item) => {
                return item.id.equals(tier.id);
            });
            this.#store.splice(existing, 1, tier);
        } else {
            this.#store.push(tier);
            this.#ids[tier.id.toHexString()] = true;
        }
    }

    /**
     * @param {import('bson-objectid').default} id
     * @returns {Promise<Tier>}
     */
    async getById(id) {
        return this.#store.find((item) => {
            return item.id.equals(id);
        });
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<Tier[]>}
     */
    async getAll(options = {}) {
        const filter = nql(options.filter, {});
        return this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        });
    }
}

module.exports = InMemoryTierRepository;
