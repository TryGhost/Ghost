/**
 * @typedef {object} ILinkRedirect
 * @prop {URL} to
 * @prop {URL} from
 */

/**
 * @typedef {object} ILinkRedirectService
 * @prop {(to: URL, slug: string) => Promise<ILinkRedirect>} addRedirect
 * @prop {() => Promise<string>} getSlug
 */

/**
 * @typedef {object} ILinkClickTrackingService
 * @prop {(link: ILinkRedirect, uuid: string) => Promise<URL>} addTrackingToRedirect
 */

/**
 * @typedef {import('@tryghost/member-attribution/lib/service')} IAttributionService
 */

/**
 * @typedef {object} UrlUtils
 * @prop {(context: string, absolute?: boolean) => string} urlFor
 * @prop {(...parts: string[]) => string} urlJoin
 */

/**
 * @typedef {object} SettingsCache
 * @prop {(key: string, options?: any) => any} get
 */

class LinkReplacementService {
    /** @type ILinkRedirectService */
    #linkRedirectService;
    /** @type ILinkClickTrackingService */
    #linkClickTrackingService;
    /** @type IAttributionService */
    #attributionService;
    /** @type UrlUtils */
    #urlUtils;
    /** @type SettingsCache */
    #settingsCache;

    /**
     * @param {object} deps
     * @param {ILinkRedirectService} deps.linkRedirectService
     * @param {ILinkClickTrackingService} deps.linkClickTrackingService
     * @param {IAttributionService} deps.attributionService
     * @param {UrlUtils} deps.urlUtils
     * @param {SettingsCache} deps.settingsCache
     */
    constructor(deps) {
        this.#linkRedirectService = deps.linkRedirectService;
        this.#linkClickTrackingService = deps.linkClickTrackingService;
        this.#attributionService = deps.attributionService;
        this.#urlUtils = deps.urlUtils;
        this.#settingsCache = deps.settingsCache;
    }

    /**
     * @private (# doesn't work because this method is being tested)
     * Return whether the provided URL is a link to the site
     * @param {URL} url
     * @returns {boolean}
     */
    isSiteDomain(url) {
        const siteUrl = new URL(this.#urlUtils.urlFor('home', true));
        if (siteUrl.host === url.host) {
            if (url.pathname.startsWith(siteUrl.pathname)) {
                return true;
            }
            return false;
        }
        return false;
    }

    async replaceLink(url, newsletter, post) {
        // Can probably happen in one call to the MemberAttributionService (but just to make clear what happens here)
        const isSite = this.isSiteDomain(url);
        const enableTracking = this.#settingsCache.get('email_track_clicks');

        // 1. Add attribution
        url = this.#attributionService.addEmailSourceAttributionTracking(url, newsletter);

        if (isSite && enableTracking) {
            // Only add attribution links to our own site (except for the newsletter referrer)
            url = this.#attributionService.addPostAttributionTracking(url, post);
        }

        const slug = await this.#linkRedirectService.getSlug();

        // 2. Add redirect for link click tracking
        const redirect = await this.#linkRedirectService.addRedirect(url, slug);

        // 3. Add click tracking by members
        // Note: we can always add the tracking params (even when isSite === false)
        // because they are added to the redirect and not the destination URL

        if (enableTracking) {
            return this.#linkClickTrackingService.addTrackingToRedirect(redirect, '--uuid--');
        }

        return redirect.from;
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
