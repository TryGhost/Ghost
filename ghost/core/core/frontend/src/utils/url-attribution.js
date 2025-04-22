/**
 * Utility functions for URL and referrer attribution parsing
 */

/**
 * Parses URL parameters to extract attribution information
 * 
 * @param {string} url - The URL to parse
 * @returns {Object} Parsed attribution data
 */
export function parseReferrer(url) {
    // Extract current URL parameters
    const currentUrl = new URL(url || window.location.href);
    
    // Parse source parameters
    const refParam = currentUrl.searchParams.get('ref');
    const sourceParam = currentUrl.searchParams.get('source');
    const utmSourceParam = currentUrl.searchParams.get('utm_source');
    const utmMediumParam = currentUrl.searchParams.get('utm_medium');
    
    // Determine primary source
    const referrerSource = refParam || sourceParam || utmSourceParam || null;
    
    // Check portal hash if needed
    if (!referrerSource && currentUrl.hash && currentUrl.hash.includes('#/portal')) {
        return parsePortalHash(currentUrl);
    }
    
    return {
        source: referrerSource,
        medium: utmMediumParam || null,
        url: window.document.referrer || null
    };
}

/**
 * Parses attribution data from portal hash URLs
 * 
 * @param {URL} url - URL object with a portal hash
 * @returns {Object} Parsed attribution data
 */
export function parsePortalHash(url) {
    const hashUrl = new URL(url.href.replace('/#/portal', ''));
    const refParam = hashUrl.searchParams.get('ref');
    const sourceParam = hashUrl.searchParams.get('source');
    const utmSourceParam = hashUrl.searchParams.get('utm_source');
    const utmMediumParam = hashUrl.searchParams.get('utm_medium');
    
    return {
        source: refParam || sourceParam || utmSourceParam || null,
        medium: utmMediumParam || null,
        url: window.document.referrer || null
    };
}

/**
 * Gets the final referrer value based on parsed data
 * 
 * @param {Object} referrerData - Parsed referrer data
 * @returns {string|null} Final referrer value or null
 */
export function getFinalReferrer(referrerData) {
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
    const referrerData = parseReferrer(url);
    return getFinalReferrer(referrerData);
}