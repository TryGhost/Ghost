/**
 * @typedef {object} ILinkRedirect
 * @prop {URL} to
 * @prop {URL} from
 */

/**
 * @typedef {object} ILinkRedirectService
 * @prop {(to: URL) => Promise<ILinkRedirect>} addRedirect
 */

/**
 * @typedef {object} ILinkClickTrackingService
 * @prop {(link: ILinkRedirect, uuid: string) => Promise<URL>} addTrackingToRedirect
 */

/**
 * @typedef {object} IAttributionService
 * @prop {(url: URL, newsletter, post) => URL} addEmailAttributionToUrl
 */

class LinkReplacementService {
    /** @type ILinkRedirectService */
    #linkRedirectService;
    /** @type ILinkClickTrackingService */
    #linkClickTrackingService;
    /** @type IAttributionService */
    #attributionService;

    /**
     * @param {object} deps
     * @param {ILinkRedirectService} deps.linkRedirectService
     * @param {ILinkClickTrackingService} deps.linkClickTrackingService
     * @param {IAttributionService} deps.attributionService
     */
    constructor(deps) {
        this.#linkRedirectService = deps.linkRedirectService;
        this.#linkClickTrackingService = deps.linkClickTrackingService;
        this.#attributionService = deps.attributionService;
    }

    async replaceLink(url, newsletter, post) {
        // Can probably happen in one call to the MemberAttributionService (but just to make clear what happens here)

        // 1. Add attribution
        // TODO: only add attribution links to our own site (except for the newsletter referrer)
        url = this.#attributionService.addEmailAttributionToUrl(url, newsletter, post);

        // 2. Add redirect for link click tracking
        const redirect = await this.#linkRedirectService.addRedirect(url);

        // 3. Add member tracking
        const result = await this.#linkClickTrackingService.addTrackingToRedirect(redirect, '--uuid--');
        return result;
    }

    /**
        Replaces the links in the provided HTML
        @param {string} html
        @param {Object} newsletter
        @param {Object} post
        @returns {Promise<string>}
    */
    async replaceLinks(html, newsletter, post) {
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        for (const el of $('a').toArray()) {
            const href = $(el).attr('href');
            try {
                if (href) {
                    let url = new URL(href);
                    url = await this.replaceLink(url, newsletter, post);

                    // Replace the replacement placeholder with a string that is not a valid URL but that will get replaced later on
                    const str = url.toString().replace(/--uuid--/g, '%%{uuid}%%');
                    $(el).attr('href', str);
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }

        return Promise.resolve($.html());
    }
}
module.exports = LinkReplacementService;
