/**
 * @typedef {Object} ReferrerData
 * @prop {string|null} [refSource]
 * @prop {string|null} [refMedium]
 * @prop {URL|null} [refUrl]
 */

/**
 * Translates referrer info into Source and Medium
 */
class ReferrerTranslator {
    /**
     *
     * @param {Object} deps
     * @param {string} deps.siteUrl
     * @param {string} deps.adminUrl
     */
    constructor({adminUrl, siteUrl}) {
        this.adminUrl = this.getUrlFromStr(adminUrl);
        this.siteUrl = this.getUrlFromStr(siteUrl);
    }

    /**
     * Calculate referrer details from history
     * @param {import('./history').UrlHistoryArray} history
     * @returns {ReferrerData|null}
     */
    getReferrerDetails(history) {
        if (history.length === 0) {
            return null;
        }

        for (const item of history) {
            const refUrl = this.getUrlFromStr(item.refUrl);
            const refSource = item.refSource;
            const refMedium = item.refMedium;

            // If referrer is Ghost Explore
            if (this.isGhostExploreRef({refUrl, refSource})) {
                return {
                    refSource: 'Ghost Explore',
                    refMedium: 'Ghost Network',
                    refUrl: refUrl
                };
            }

            // If referrer is Ghost.org
            if (this.isGhostOrgUrl(refUrl)) {
                return {
                    refSource: 'Ghost.org',
                    refMedium: 'Ghost Network',
                    refUrl: refUrl
                };
            }

            // If referrer is Ghost Newsletter
            if (this.isGhostNewsletter({refSource})) {
                return {
                    refSource: refSource.replace(/-/g, ' '),
                    refMedium: 'Email',
                    refUrl: refUrl
                };
            }

            // If referrer is from query params
            if (refSource) {
                const urlData = this.getDataFromUrl() || {};
                return {
                    refSource: refSource,
                    refMedium: refMedium || urlData?.medium || null,
                    refUrl: refUrl
                };
            }

            // If referrer is known external URL
            // TODO: Use list of known external urls to fetch source/medium
            if (refUrl && !this.isSiteDomain(refUrl)) {
                const urlData = this.getDataFromUrl();

                if (urlData) {
                    return {
                        refSource: urlData?.source,
                        refMedium: urlData?.medium,
                        refUrl: refUrl
                    };
                }
            }
        }

        return null;
    }

    // Fetches referrer data from known external URLs
    //TODO: Use list of known external urls to fetch source/medium
    getDataFromUrl() {
        return null;
    }

    /**
     * @private
     * Return URL object for provided URL string
     * @param {string} url
     * @returns {URL|null}
     */
    getUrlFromStr(url) {
        try {
            return new URL(url);
        } catch (e) {
            return null;
        }
    }

    /**
     * @private
     * Return whether the provided URL is a link to the site
     * @param {URL} url
     * @returns {boolean}
     */
    isSiteDomain(url) {
        try {
            if (this.siteUrl && this.siteUrl?.hostname === url?.hostname) {
                if (url?.pathname?.startsWith(this.siteUrl?.pathname)) {
                    return true;
                }
                return false;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * @private
     * Return whether provided ref is a Ghost newsletter
     * @param {Object} deps
     * @param {string|null} deps.refSource
     * @returns {boolean}
     */
    isGhostNewsletter({refSource}) {
        // if refferer source ends with -newsletter
        return refSource?.endsWith('-newsletter');
    }

    /**
     * @private
     * Return whether provided ref is a Ghost.org URL
     * @param {URL|null} refUrl
     * @returns {boolean}
     */
    isGhostOrgUrl(refUrl) {
        return refUrl?.hostname === 'ghost.org';
    }

    /**
     * @private
     * Return whether provided ref is Ghost Explore
     * @param {Object} deps
     * @param {URL|null} deps.refUrl
     * @param {string|null} deps.refSource
     * @returns {boolean}
     */
    isGhostExploreRef({refUrl, refSource}) {
        if (refSource === 'ghost-explore') {
            return true;
        }

        if (refUrl?.hostname
            && this.adminUrl?.hostname === refUrl?.hostname
            && refUrl?.pathname?.startsWith(this.adminUrl?.pathname)
        ) {
            return true;
        }

        if (refUrl?.hostname === 'ghost.org' && refUrl?.pathname?.startsWith('/explore')) {
            return true;
        }

        return false;
    }
}

module.exports = ReferrerTranslator;
