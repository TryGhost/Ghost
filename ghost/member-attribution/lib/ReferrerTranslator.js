/**
 * @typedef {Object} ReferrerData
 * @prop {string|null} [referrerSource]
 * @prop {string|null} [referrerMedium]
 * @prop {string|null} [referrerUrl]
 */

const knownReferrers = require('@tryghost/referrers');

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
     * @param {import('./UrlHistory').UrlHistoryArray} history
     * @returns {ReferrerData|null}
     */
    getReferrerDetails(history) {
        // Empty history will return null as it means script is not loaded
        if (history.length === 0) {
            return {
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            };
        }

        for (const item of history) {
            const referrerUrl = this.getUrlFromStr(item.referrerUrl);

            if (referrerUrl?.hostname === 'checkout.stripe.com') {
                // Ignore stripe, because second try payments should not be attributed to Stripe
                continue;
            }

            const referrerSource = item.referrerSource;
            const referrerMedium = item.referrerMedium;

            // If referrer is Ghost Explore
            if (this.isGhostExploreRef({referrerUrl, referrerSource})) {
                return {
                    referrerSource: 'Ghost Explore',
                    referrerMedium: 'Ghost Network',
                    referrerUrl: referrerUrl?.hostname ?? null
                };
            }

            // If referrer is Ghost.org
            if (this.isGhostOrgUrl(referrerUrl)) {
                return {
                    referrerSource: 'Ghost.org',
                    referrerMedium: 'Ghost Network',
                    referrerUrl: referrerUrl?.hostname
                };
            }

            // If referrer is Ghost Newsletter
            if (this.isGhostNewsletter({referrerSource})) {
                return {
                    referrerSource: referrerSource.replace(/-/g, ' '),
                    referrerMedium: 'Email',
                    referrerUrl: referrerUrl?.hostname ?? null
                };
            }

            // If referrer is from query params
            if (referrerSource) {
                const urlData = referrerUrl ? this.getDataFromUrl(referrerUrl) : null;
                const knownSource = Object.values(knownReferrers).find(referrer => referrer.source.toLowerCase() === referrerSource.toLowerCase());
                return {
                    referrerSource: knownSource?.source || referrerSource,
                    referrerMedium: knownSource?.medium || referrerMedium || urlData?.medium || null,
                    referrerUrl: referrerUrl?.hostname ?? null
                };
            }

            // If referrer is known external URL
            if (referrerUrl && !this.isSiteDomain(referrerUrl)) {
                const urlData = this.getDataFromUrl(referrerUrl);

                // Use known source/medium if available
                if (urlData) {
                    return {
                        referrerSource: urlData?.source ?? null,
                        referrerMedium: urlData?.medium ?? null,
                        referrerUrl: referrerUrl?.hostname ?? null
                    };
                }
                // Use the hostname as a source
                return {
                    referrerSource: referrerUrl?.hostname ?? null,
                    referrerMedium: null,
                    referrerUrl: referrerUrl?.hostname ?? null
                };
            }
        }

        return {
            referrerSource: 'Direct',
            referrerMedium: null,
            referrerUrl: null
        };
    }

    // Fetches referrer data from known external URLs
    getDataFromUrl(url) {
        // Allow matching both "google.ac/products" and "google.ac" as a source
        const urlHostPath = url?.host + url?.pathname;
        const urlDataKey = Object.keys(knownReferrers).sort((a, b) => {
            // The longer key has higher the priority so google.ac/products is selected before google.ac
            return b.length - a.length;
        }).find((source) => {
            return urlHostPath?.startsWith(source);
        });

        return urlDataKey ? knownReferrers[urlDataKey] : null;
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
     * @param {string|null} deps.referrerSource
     * @returns {boolean}
     */
    isGhostNewsletter({referrerSource}) {
        // if refferer source ends with -newsletter
        return referrerSource?.endsWith('-newsletter');
    }

    /**
     * @private
     * Return whether provided ref is a Ghost.org URL
     * @param {URL|null} referrerUrl
     * @returns {boolean}
     */
    isGhostOrgUrl(referrerUrl) {
        return referrerUrl?.hostname === 'ghost.org';
    }

    /**
     * @private
     * Return whether provided ref is Ghost Explore
     * @param {Object} deps
     * @param {URL|null} deps.referrerUrl
     * @param {string|null} deps.referrerSource
     * @returns {boolean}
     */
    isGhostExploreRef({referrerUrl, referrerSource}) {
        if (referrerSource === 'ghost-explore') {
            return true;
        }

        if (referrerUrl?.hostname
            && this.adminUrl?.hostname === referrerUrl?.hostname
            && referrerUrl?.pathname?.startsWith(this.adminUrl?.pathname)
        ) {
            return true;
        }

        if (referrerUrl?.hostname === 'ghost.org' && referrerUrl?.pathname?.startsWith('/explore')) {
            return true;
        }

        return false;
    }
}

module.exports = ReferrerTranslator;
