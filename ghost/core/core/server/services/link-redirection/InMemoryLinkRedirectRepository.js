const nql = require('@tryghost/nql');

/**
 * @typedef {import('@tryghost/link-redirects/lib/LinkRedirect')} LinkRedirect
 */

class InMemoryLinkRedirectRepository {
    /** @type {LinkRedirect[]} */
    #store = [];
    /** @type {Object.<string, true>} */
    #ids = {};

    /**
     * @param {LinkRedirect} linkRedirect
     * @returns {any}
     */
    toPrimitive(linkRedirect) {
        return {
            link_id: linkRedirect.link_id.toHexString(),
            from: linkRedirect.from.toString(),
            to: linkRedirect.to.toString()
        };
    }

    /**
     * @param {LinkRedirect} linkRedirect
     * @returns {Promise<void>}
     */
    async save(linkRedirect) {
        if (this.#ids[linkRedirect.link_id.toHexString()]) {
            const existing = this.#store.findIndex((item) => {
                return item.link_id.equals(linkRedirect.link_id);
            });
            this.#store.splice(existing, 1, linkRedirect);
        } else {
            this.#store.push(linkRedirect);
            this.#ids[linkRedirect.link_id.toHexString()] = true;
        }
    }

    /**
     * @param {URL} url
     * @returns {Promise<LinkRedirect>}
     */
    async getByURL(url) {
        return this.#store.find((link) => {
            return link.from.pathname === url.pathname;
        });
    }

    /**
     * @param {import('bson-objectid').default} id
     * @returns {Promise<LinkRedirect>}
     */
    async getByID(id) {
        return this.#store.find((link) => {
            return link.link_id.equals(id);
        });
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<LinkRedirect[]>}
     */
    async getAll(options = {}) {
        const filter = nql(options.filter, {});
        return this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        });
    }
}

module.exports = InMemoryLinkRedirectRepository;
