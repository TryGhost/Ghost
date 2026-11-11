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
export function navigateTo(
  route: string,
  {
    replace = false,
    // Injectable for tests: jsdom's window.location can't be stubbed
    location = window.location,
  }: { replace?: boolean; location?: Pick<Location, 'href' | 'hash' | 'replace'> } = {},
): boolean {
  const navigateInternal = (internalRoute: string) => {
    const normalizedRoute = internalRoute.startsWith('/') ? internalRoute : `/${internalRoute}`;

    if (replace) {
      location.replace(`#${normalizedRoute}`);
    } else {
      location.hash = normalizedRoute;
    }
  };

  // Check if URL has a protocol scheme
  if (route.match(/^[a-z]+:/i)) {
    try {
      const url = new URL(route);
      // Only allow explicitly safe schemes
      if (ALLOWED_SCHEMES.includes(url.protocol)) {
        if (replace) {
          location.replace(route);
        } else {
          location.href = route;
        }
        return true;
      }
      // Reject dangerous schemes (javascript:, data:, etc.)
      return false;
    } catch {
      // Invalid URL, treat as internal route
      navigateInternal(route);
      return true;
    }
  } else {
    // Admin route - use hash routing
    navigateInternal(route);
    return true;
  }
}
