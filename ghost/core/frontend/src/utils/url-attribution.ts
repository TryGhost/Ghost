/** Utility functions for URL and referrer attribution parsing */

type AttributionData = {
  /** Primary attribution source (ref || source || utm_source) */
  source: string | null;
  /** UTM medium parameter */
  medium: string | null;
  /** Browser's document.referrer */
  url: string | null;
  /** UTM source parameter */
  utmSource: string | null;
  /** UTM medium parameter */
  utmMedium: string | null;
  /** UTM term/keyword parameter */
  utmTerm: string | null;
  /** UTM campaign parameter */
  utmCampaign: string | null;
  /** UTM content/variant parameter */
  utmContent: string | null;
};

/**
 * Extracts attribution parameters from URL search params
 *
 * @private
 * @param searchParams - The search params to parse
 * @returns Parsed attribution data with all UTM parameters
 */
function extractParams(searchParams: Readonly<URLSearchParams>): AttributionData {
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
    utmContent: utmContentParam || null,
  };
}

/**
 * Parses URL parameters to extract complete referrer/attribution data
 *
 * @param url - The URL to parse (defaults to current URL)
 * @returns Complete attribution data including all UTM parameters
 */
export function parseReferrerData(url?: string): AttributionData {
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
 *
 * Prioritizes: source → medium → url
 *
 * Filters out same-domain referrers
 *
 * @private
 * @param referrerData - Parsed referrer data
 * @returns Primary referrer value or null
 */
function selectPrimaryReferrer(referrerData: AttributionData): string | null {
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
    } catch {
      // If URL parsing fails (e.g., for non-URL refs like "ghost-newsletter")
      return finalReferrer;
    }
  }

  return finalReferrer;
}

/**
 * One-step function to get the final referrer from a URL
 *
 * @param url - URL to parse (defaults to current URL)
 * @returns Final referrer value
 */
export function getReferrer(url?: string): string | null {
  const referrerData = parseReferrerData(url);
  return selectPrimaryReferrer(referrerData);
}
