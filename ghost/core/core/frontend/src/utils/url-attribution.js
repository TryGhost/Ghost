/**
 * Utility functions for URL and referrer attribution parsing
 */

/**
 * @typedef {Object} AttributionData
 * @property {string|null} source - Primary attribution source (ref || source || utm_source)
 * @property {string|null} medium - UTM medium parameter
 * @property {string|null} url - Browser's document.referrer
 * @property {string|null} utmSource - UTM source parameter
 * @property {string|null} utmMedium - UTM medium parameter
 * @property {string|null} utmTerm - UTM term/keyword parameter
 * @property {string|null} utmCampaign - UTM campaign parameter
 * @property {string|null} utmContent - UTM content/variant parameter
 */

/**
 * Extracts attribution parameters from URL search params
 * @private
 * @param {URLSearchParams} searchParams - The search params to parse
 * @returns {AttributionData} Parsed attribution data with all UTM parameters
 */
function extractParams(searchParams) {
    const refParam = searchParams.get('ref');
    const sourceParam = searchParams.get('source');
    const utmSourceParam = searchParams.get('utm_source');
    const utmMediumParam = searchParams.get('utm_medium');
    const utmTermParam = searchParams.get('utm_term');
    const utmCampaignParam = searchParams.get('utm_campaign');
    const utmContentParam = searchParams.get('utm_content');
    
    // Determine primary source
    const referrerSource = refParam || sourceParam || utmSourceParam || null;
    
    return {
        source: referrerSource,
        medium: utmMediumParam || null,
        url: window.document.referrer || null,
        utmSource: utmSourceParam || null,
        utmMedium: utmMediumParam || null,
        utmTerm: utmTermParam || null,
        utmCampaign: utmCampaignParam || null,
        utmContent: utmContentParam || null
    };
}

/**
 * Parses URL parameters to extract complete referrer/attribution data
 * 
 * @param {string} url - The URL to parse (defaults to current URL)
 * @returns {AttributionData} Complete attribution data including all UTM parameters
 */
export function parseReferrerData(url) {
    // Extract current URL parameters
    const currentUrl = new URL(url || window.location.href);
    let searchParams = currentUrl.searchParams;
    
    // Handle portal hash URLs - extract params from hash instead
    if (currentUrl.hash && currentUrl.hash.includes('#/portal')) {
        const hashUrl = new URL(currentUrl.href.replace('/#/portal', ''));
        searchParams = hashUrl.searchParams;
    }
    
    return extractParams(searchParams);
}

/**
 * Selects the primary referrer value from parsed attribution data
 * Prioritizes: source → medium → url
 * Filters out same-domain referrers
 * @private
 * @param {AttributionData} referrerData - Parsed referrer data
 * @returns {string|null} Primary referrer value or null
 */
function selectPrimaryReferrer(referrerData) {
    const { source, medium, url } = referrerData;
    const finalReferrer = source || medium || url || null;
    
    if (finalReferrer) {
        try {
            // Check if referrer is from same domain
            const referrerHost = new URL(finalReferrer).hostname;
            const currentHost = window.location.hostname;
            if (referrerHost === currentHost) {
                return null;
            }
        } catch (e) {
            // If URL parsing fails (e.g., for non-URL refs like "ghost-newsletter")
            return finalReferrer;
        }
    }
    
    return finalReferrer;
}

/**
 * One-step function to get the final referrer from a URL
 *
 * @param {string} [url] - URL to parse (defaults to current URL)
 * @returns {string|null} Final referrer value
 */
export function getReferrer(url) {
    const referrerData = parseReferrerData(url);
    return selectPrimaryReferrer(referrerData);
}

/**
 * Source/medium to attribute a gift-link visit (`?gift=token`) to, so that
 * gift-derived signups appear in member attribution instead of being credited
 * to whatever channel the link happened to be shared through (usually Direct).
 *
 * Returns null when the URL isn't a gift link, or when it already carries an
 * explicit ref/source/utm_source the site owner set — that wins over the gift.
 * Note: an invalid gift token is stripped server-side via a 301 before the page
 * renders, so a `?gift` param present at render time is always a valid gift.
 *
 * @param {string} url - The URL to inspect (the current page URL)
 * @param {AttributionData} referrerData - Already-parsed data for the same URL
 * @returns {{source: string, medium: string}|null}
 */
export function getGiftReferrer(url, referrerData) {
    if (referrerData && referrerData.source) {
        return null;
    }

    try {
        if (new URL(url).searchParams.has('gift')) {
            return {source: 'Gift', medium: 'gift'};
        }
    } catch (e) {
        // Malformed URL - not a gift link
    }

    return null;
}