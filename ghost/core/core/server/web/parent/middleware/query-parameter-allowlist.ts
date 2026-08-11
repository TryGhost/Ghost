export const QUERY_PARAMETER_ALLOWLIST = [
    'm', // Used for link tracking
    'v', // Asset invalidation
    'r', // Password-protected site redirect
    'token', // Used by Members API
    'action', // Used for unsubscribe links
    'ssml', // Used for Ghost SSO
    'ssts', // Used for Ghost SSO
    'uuid', // Member UUID used for unsubscribing
    'key', // Members key used to sign unsubscribe paths
    'portal-action', // Members Portal actions
    'newsletter', // Used for multiple newsletters, including unsubscribe links
    'firstStart', // Opens the getting-started modal
    'include', // Used by the frontend comments API
    'limit', // Used by the frontend comments API
    'order', // Used by the frontend comments API
    'filter', // Used by the frontend comments API
    'page', // Used by the frontend comments API
    'ids', // Used by the frontend comments counts API
    'via', // Used for FirstPromoter referral tracking
    'ref', // Used for attribution tracking
    'source', // Used for attribution tracking
    'utm_source', // Used for attribution tracking
    'utm_medium', // Used for attribution tracking
    'attribution_id', // Used for attribution tracking
    'attribution_type', // Used for attribution tracking
    'resource', // Used for /.well-known/webfinger
    'sr_id', // Used for signup redirect tracking
    'member_status', // Used for testing card and paywall content visibility
    'otc_verification', // Used for one-time codes in member sign-ins
    'admin', // Used for admin toolbar activation
    'admin_toolbar', // Used for admin toolbar suppression
    'gift', // Gift-link unlock token on canonical post URLs
    'step' // Used in automations
] as const;

export const CONTENT_API_QUERY_PARAMETER_ALLOWLIST = [
    'absolute_urls', // Converts relative URLs to absolute URLs
    'collection', // Filters by collection
    'debug', // Enables debug mode where available
    'fields', // Limits returned fields
    'filter', // Filters resources using NQL
    'formats', // Selects content formats
    'include', // Includes related resources
    'key', // Content API authentication key
    'limit', // Number of resources per page
    'order', // Sort order
    'page' // Page number for paginated results
] as const;
