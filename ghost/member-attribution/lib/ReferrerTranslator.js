/**
 * @typedef {Object} ReferrerData
 * @prop {string|null} [referrerSource]
 * @prop {string|null} [referrerMedium]
 * @prop {string|null} [referrerUrl]
 */

const {ReferrerParser} = require('@tryghost/referrer-parser');

/**
 * Translates referrer info into Source and Medium
 * Uses the @tryghost/referrer-parser package under the hood
 */
class ReferrerTranslator {
    /**
     *
     * @param {Object} deps
     * @param {string} deps.siteUrl
     * @param {string} deps.adminUrl
     */
    constructor({adminUrl, siteUrl}) {
        this.parser = new ReferrerParser({
            adminUrl,
            siteUrl
        });
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
            console.log('item', item);
            let refUrl = this.getUrlFromStr(item.referrerUrl);
            if (refUrl?.hostname === 'checkout.stripe.com') {
                // Ignore stripe, because second try payments should not be attributed to Stripe
                continue;
            }

            const {referrerSource, referrerMedium, referrerUrl} = this.parser.parse(item.referrerUrl, item.referrerSource);

            return {
                referrerSource,
                referrerMedium,
                referrerUrl
            };
        }

        return {
            referrerSource: 'Direct',
            referrerMedium: null,
            referrerUrl: null
        };
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
}

module.exports = ReferrerTranslator;
