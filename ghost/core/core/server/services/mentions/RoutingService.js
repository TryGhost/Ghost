/**
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').IRoutingService} IRoutingService
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').IResourceService} IResourceService
 */

/**
 * @typedef {object} IUrlUtils
 * @prop {() => string} getSiteUrl
 * @prop {() => string} getSubdir
 */

/**
 * @implements {IRoutingService}
 */
module.exports = class RoutingService {
    /** @typedef {URL} */
    #siteUrl;

    /** @typedef {IResourceService} */
    #resourceService;

    /**
     * @param {object} deps
     * @param {URL} deps.siteUrl
     * @param {IResourceService} deps.resourceService
     * @param {import('got')} deps.externalRequest;
     */
    constructor(deps) {
        this.#siteUrl = deps.siteUrl;
        this.#resourceService = deps.resourceService;
    }

    /**
     * @param {URL} url
     */
    async pageExists(url) {
        if (this.#siteUrl.origin !== url.origin) {
            return false;
        }
        const subdir = removeTrailingSlash(this.#siteUrl.pathname);
        if (subdir && !url.pathname.startsWith(subdir)) {
            return false;
        }

        const resource = await this.#resourceService.getByURL(url);

        if (resource) {
            return true;
        }

        return false;
    }
};

/**
 * @param {string} str
 */
function removeTrailingSlash(str) {
    return str.replace(/\/$/, '');
}
