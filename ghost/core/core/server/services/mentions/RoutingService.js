const logging = require('@tryghost/logging');

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

    /** @typedef {import('got')} */
    #externalRequest;

    /**
     * @param {object} deps
     * @param {URL} deps.siteUrl
     * @param {IResourceService} deps.resourceService
     * @param {import('got')} deps.externalRequest;
     */
    constructor(deps) {
        this.#siteUrl = deps.siteUrl;
        this.#resourceService = deps.resourceService;
        this.#externalRequest = deps.externalRequest;
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

        if (resource?.type !== null) {
            return true;
        }

        try {
            const response = await this.#externalRequest.head(url, {
                followRedirect: false,
                throwHttpErrors: false
            });
            if (response.statusCode < 400 && response.statusCode > 199) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            logging.error(err);
            return false;
        }
    }
};

/**
 * @param {string} str
 */
function removeTrailingSlash(str) {
    return str.replace(/\/$/, '');
}
