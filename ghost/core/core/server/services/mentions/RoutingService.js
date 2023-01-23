/**
 * @typedef {import('@tryghost/webmentions/lib/MentionsAPI').IRoutingService} IRoutingService
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

    /**
     * @param {object} deps
     * @param {URL} deps.siteUrl
     */
    constructor(deps) {
        this.#siteUrl = deps.siteUrl;
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

        return true;
    }
};

/**
 * @param {string} str
 */
function removeTrailingSlash(str) {
    return str.replace(/\/$/, '');
}
