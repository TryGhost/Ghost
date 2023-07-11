const {slugify} = require('@tryghost/string');
const LinkReplacer = require('@tryghost/link-replacer');

const blockedReferrerDomains = [
    // Facebook has some restrictions on the 'ref' attribute (max 15 chars + restricted character set) that breaks links if we add ?ref=longer-string
    'facebook.com',
    'www.facebook.com',
    'web.archive.org',
    'archive.org',
    'www.federalreserve.gov'
];

/**
 * Adds ?ref to outbound links
 */
class OutboundLinkTagger {
    /**
     *
     * @param {Object} deps
     * @param {() => boolean} deps.isEnabled
     * @param {() => string} deps.getSiteUrl
     * @param {{isSiteUrl(url, context): boolean}} deps.urlUtils
     */
    constructor({isEnabled, getSiteUrl, urlUtils}) {
        this._isEnabled = isEnabled;
        this._getSiteUrl = getSiteUrl;
        this._urlUtils = urlUtils;
    }

    get isEnabled() {
        return this._isEnabled();
    }

    get siteUrl() {
        return new URL(this._getSiteUrl());
    }

    /**
     * Add some parameters to a URL that points to a site, so that site can detect that the traffic is coming from a Ghost site or newsletter.
     * Note that this is disabled if outboundLinkTagging setting is disabled.
     * @param {URL} url instance that will get updated
     * @param {Object} [useNewsletter] Use the newsletter name instead of the site name as referrer source
     * @returns {URL}
     */
    addToUrl(url, useNewsletter) {
        // Create a deep copy
        url = new URL(url);

        if (!this.isEnabled) {
            return url;
        }

        if (url.searchParams.has('ref') || url.searchParams.has('utm_source') || url.searchParams.has('source')) {
            // Don't overwrite + keep existing source attribution
            return url;
        }

        // Check protocol
        if (!url.protocol.startsWith('http')) {
            return url;
        }

        // Check blocked domains
        const referrerDomain = url.hostname;
        if (blockedReferrerDomains.includes(referrerDomain)) {
            return url;
        }

        // Tag url with site's base domain, excluding www
        const domain = this.getDomainFromUrl(this.siteUrl);
        if (useNewsletter) {
            const name = slugify(useNewsletter.get('name'));

            // If newsletter name ends with newsletter, don't add it again
            const ref = name.endsWith('newsletter') ? name : `${name}-newsletter`;
            url.searchParams.append('ref', ref);
        } else {
            url.searchParams.append('ref', domain);
        }
        return url;
    }

    async addToHtml(html) {
        if (!this.isEnabled) {
            return html;
        }
        return await LinkReplacer.replace(html, (url) => {
            const isSite = this._urlUtils.isSiteUrl(url);
            if (isSite) {
                return url;
            }
            return this.addToUrl(url);
        });
    }

    /**  *
     * Extracts the domain from a given URL for use in the ?ref= parameter
     * e.g. https://example.com/ -> example.com
     * e.g. https://example.ghost.io/ -> example.ghost.io
     * e.g. https://www.example.com/ -> example.com
     *
     * @param {URL} url to extract domain from
     * @returns {string} just the domain, e.g. example.com or example.ghost.io, but not www.example.com
    */
    getDomainFromUrl(url) {
        const hostname = url.hostname;
        const domain = hostname.replace(/^www\./, '');
        return domain;
    }
}

module.exports = OutboundLinkTagger;
