const nql = require('@tryghost/nql');

/**
 * @typedef {import('@tryghost/link-replacement/lib/PostLink')} PostLink
 */

class InMemoryPostLinkRepository {
    /** @type {PostLink[]} */
    #store = [];

    /**
     * @param {PostLink} postLink
     * @returns {any}
     */
    toPrimitive(postLink) {
        return {
            link_id: postLink.link_id.toHexString(),
            post_id: postLink.post_id.toHexString()
        };
    }

    /**
     * @param {PostLink} postLink
     * @returns {Promise<void>}
     */
    async save(postLink) {
        console.log(postLink);
        this.#store.push(postLink);
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<PostLink[]>}
     */
    async getAll(options = {}) {
        const filter = nql(options.filter, {});
        console.log(this.#store.slice());
        return this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        });
    }
}

module.exports = InMemoryPostLinkRepository;
