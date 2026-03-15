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