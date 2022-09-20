const {PostLink} = require('@tryghost/link-tracking');
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

    async getAll(options) {
        const collection = await this.#LinkRedirect.findAll(options);

        const result = [];

        for (const model of collection.models) {
            result.push(new PostLink({
                link_id: model.get('id'),
                post_id: model.get('post_id')
            }));
        }

        return result;
    }

    /**
     * @param {PostLink} postLink
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
