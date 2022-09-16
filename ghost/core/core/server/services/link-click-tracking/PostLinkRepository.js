/**
 * @typedef {import('bson-objectid').default} ObjectID
 */

module.exports = class PostLinkRepository {
    /** @type {Object} */
    #LinkRedirect;

    /**
     * @param {object} deps
     * @param {object} deps.LinkRedirect Bookshelf Model
     */
    constructor(deps) {
        this.#LinkRedirect = deps.LinkRedirect;
    }

    /**
     * @param {import('@tryghost/link-tracking/lib/PostLink')} postLink 
     * @returns {Promise<void>}
     */
    async save(postLink) {
        await this.#LinkRedirect.edit({
            post_id: postLink.post_id.toHexString()
        }, {
            id: postLink.link_id.toHexString()
        });
    }
};
