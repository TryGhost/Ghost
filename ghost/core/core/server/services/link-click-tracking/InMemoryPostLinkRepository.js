const nql = require('@tryghost/nql');
const {FullPostLink} = require('@tryghost/link-tracking');

/**
 * @typedef {import('@tryghost/link-tracking/lib/PostLink')} PostLink
 */

class InMemoryPostLinkRepository {
    /** @type {PostLink[]} */
    #store = [];
    /** @type {Object} */
    #linkRedirectRepository;
    /** @type {Object} */
    #linkClickRepository;

    /**
     * @param {object} deps
     * @param {object} deps.linkRedirectRepository Bookshelf Model
     * @param {object} deps.linkClickRepository Bookshelf Model
     */
    constructor(deps) {
        this.#linkRedirectRepository = deps.linkRedirectRepository;
        this.#linkClickRepository = deps.linkClickRepository;
    }

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
        this.#store.push(postLink);
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @returns {Promise<InstanceType<FullPostLink>[]>}
     */
    async getAll(options = {}) {
        const data = [];

        const filter = nql(options.filter, {});
        const postLinks = this.#store.slice().filter((item) => {
            return filter.queryJSON(this.toPrimitive(item));
        });

        if (postLinks.length === 0) {
            return data;
        }

        const links = await this.#linkRedirectRepository.getAll({
            filter: `id:[${postLinks.map(x => x.link_id.toHexString()).join(',')}]`
        });

        for (const link of links) {
            const events = await this.#linkClickRepository.getAll({
                filter: `link_id:[${link.link_id.toHexString()}]`
            });

            const result = new FullPostLink({
                post_id: postLinks.find((postLink) => {
                    return postLink.link_id.equals(link.link_id);
                }).post_id.toHexString(),
                link,
                count: {
                    clicks: events.length
                }
            });

            data.push(result);
        }
        return data;
    }
}

module.exports = InMemoryPostLinkRepository;
