const nql = require('@tryghost/nql');

/**
 * @typedef {import('@tryghost/link-tracking/lib/LinkClick')} LinkClick
 */

class InMemoryLinkClickRepository {
    /** @type {LinkClick[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

    /**
     * @param {LinkClick} linkClick
     * @returns {any}
     */
    toPrimitive(linkClick) {
        return {
            event_id: linkClick.event_id.toHexString(),
            member_id: linkClick.member_id.toHexString(),
            link_id: linkClick.link_id.toHexString()
        };
    }

    /**
     * @param {LinkClick} linkClick
     * @returns {Promise<void>}
     */
    async save(linkClick) {
        if (this.#ids[linkClick.event_id.toHexString()]) {
            const existing = this.#store.findIndex((item) => {
                return item.event_id.equals(linkClick.event_id);
            });
            this.#store.splice(existing, 1, linkClick);
        } else {
            this.#store.push(linkClick);
            this.#ids[linkClick.event_id.toHexString()] = true;
        }
    }

    /**
     * @param {import('bson-objectid').default} id
     * @returns {Promise<LinkClick>}
     */
    async getByID(id) {
        return this.#store.find((item) => {
            return item.event_id.equals(id);
        });
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<LinkClick[]>}
     */
    async getAll(options = {}) {
        const filter = nql(options.filter, {});
        return this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        });
    }
}

module.exports = InMemoryLinkClickRepository;
