const ObjectID = require('bson-objectid').default;

/**
 * @typedef {import('./mentions-api').IResourceService} IResourceService
 */

/**
 * @implements {IResourceService}
 */
module.exports = class ResourceService {
    /** @type {import('@tryghost/url-utils/lib/url-utils')} */
    #urlUtils;

    /** @type {import('../url')} */
    #urlService;

    /**
     * @param {object} deps
     * @param {import('@tryghost/url-utils/lib/url-utils')} deps.urlUtils
     * @param {import('../url')} deps.urlService
     */
    constructor(deps) {
        this.#urlUtils = deps.urlUtils;
        this.#urlService = deps.urlService;
    }

    /**
     * @param {URL} url
     * @returns {Promise<import('./mentions-api').ResourceResult>}
     */
    async getByURL(url) {
        const path = this.#urlUtils.absoluteToRelative(url.href, {withoutSubdirectory: true});
        const resource = await this.#urlService.facade.resolveUrl(path);
        if (resource?.type === 'posts') {
            return {
                type: 'post',
                id: ObjectID.createFromHexString(resource.id)
            };
        }
        if (resource?.type === 'pages') {
            return {
                type: 'page',
                id: ObjectID.createFromHexString(resource.id)
            };
        }
        return {
            type: null,
            id: null
        };
    }
};
