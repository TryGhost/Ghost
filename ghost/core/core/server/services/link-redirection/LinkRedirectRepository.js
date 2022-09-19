const LinkRedirect = require('@tryghost/link-redirects').LinkRedirect;
const ObjectID = require('bson-objectid').default;

module.exports = class LinkRedirectRepository {
    /** @type {Object} */
    #LinkRedirect;
    /** @type {Object} */
    #urlUtils;

    /**
     * @param {object} deps
     * @param {object} deps.LinkRedirect Bookshelf Model
     * @param {object} deps.urlUtils 
     */
    constructor(deps) {
        this.#LinkRedirect = deps.LinkRedirect;
        this.#urlUtils = deps.urlUtils;
    }

    /**
     * @param {InstanceType<LinkRedirect>} linkRedirect 
     * @returns {Promise<void>}
     */
    async save(linkRedirect) {
        const model = await this.#LinkRedirect.add({
            // Only store the parthname (no support for variable query strings)
            from: linkRedirect.from.pathname, 
            to: this.#urlUtils.absoluteToTransformReady(linkRedirect.to.href)
        }, {});

        linkRedirect.link_id = ObjectID.createFromHexString(model.id);
    }

    /**
     * 
     * @param {URL} url 
     * @returns {Promise<InstanceType<LinkRedirect>|undefined>} linkRedirect 
     */
    async getByURL(url) {
        // TODO: strip subdirectory from url.pathname

        const linkRedirect = await this.#LinkRedirect.findOne({
            from: url.pathname
        }, {});

        if (linkRedirect) {
            return new LinkRedirect({
                id: linkRedirect.id,
                from: url,
                to: new URL(this.#urlUtils.transformReadyToAbsolute(linkRedirect.get('to')))
            });
        }
    }
};
