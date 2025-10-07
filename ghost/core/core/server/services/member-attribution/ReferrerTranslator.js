/**
 * @typedef {Object} ReferrerData
 * @prop {string|null} [referrerSource]
 * @prop {string|null} [referrerMedium]
 * @prop {string|null} [referrerUrl]
 * @prop {string|null} [utmSource]
 * @prop {string|null} [utmMedium]
 * @prop {string|null} [utmCampaign]
 * @prop {string|null} [utmTerm]
 * @prop {string|null} [utmContent]
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
                referrerUrl: null,
                utmSource: null,
                utmMedium: null,
                utmCampaign: null,
                utmTerm: null,
                utmContent: null
            };
        }

        // Look for UTM parameters first (most recent entry with UTM data)
        let utmData = {
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            utmTerm: null,
            utmContent: null
        };

        for (const item of history) {
            if (item.utmSource || item.utmMedium || item.utmCampaign || item.utmTerm || item.utmContent) {
                utmData = {
                    utmSource: item.utmSource || null,
                    utmMedium: item.utmMedium || null,
                    utmCampaign: item.utmCampaign || null,
                    utmTerm: item.utmTerm || null,
                    utmContent: item.utmContent || null
                };
                break;
            }
        }

        for (const item of history) {
            let refUrl = this.getUrlFromStr(item.referrerUrl);
            if (refUrl?.hostname === 'checkout.stripe.com') {
                // Ignore stripe, because second try payments should not be attributed to Stripe
                continue;
            }
            // Use the parser to check against known referrers
            const {referrerSource, referrerMedium, referrerUrl} = this.parser.parse(item.referrerUrl, item.referrerSource, item.referrerMedium);
            // Keep searching history if there's no match
            if (referrerSource || referrerMedium || referrerUrl) {
                return {
                    referrerSource,
                    referrerMedium,
                    referrerUrl,
                    ...utmData
                };
            }
        }
        // Fall back to Direct if no matches in any history entry
        return {
            referrerSource: 'Direct',
            referrerMedium: null,
            referrerUrl: null,
            ...utmData
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
