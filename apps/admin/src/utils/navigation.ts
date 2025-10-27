/**
 * Allowed URL schemes for external navigation
 */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Navigates to a URL, validating the protocol scheme for external URLs.
 * Prevents XSS attacks by rejecting dangerous schemes like javascript: and data:
 * Handles both external URLs (with protocol validation) and internal routes (via hash navigation).
 *
 * @param route - The route to navigate to
 * @returns true if navigation was performed, false otherwise
 */
export function navigateTo(route: string): boolean {
    // Check if URL has a protocol scheme
    if (route.match(/^[a-z]+:/i)) {
        try {
            const url = new URL(route);
            // Only allow explicitly safe schemes
            if (ALLOWED_SCHEMES.includes(url.protocol)) {
                window.location.href = route;
                return true;
            }
            // Reject dangerous schemes (javascript:, data:, etc.)
            return false;
        } catch {
            // Invalid URL, treat as internal route
            const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
            window.location.hash = normalizedRoute;
            return true;
        }
    } else {
        // Internal cross-app navigation - use hash routing
        const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
        window.location.hash = normalizedRoute;
        return true;
    }
}
