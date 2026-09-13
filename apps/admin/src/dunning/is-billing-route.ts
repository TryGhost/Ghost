/**
 * The billing app's own routes: the dunning UI stands down there so the user
 * can actually reach the payment form (and the billing app shows its own
 * outstanding-invoice state).
 */
export function isBillingRoute(pathname: string): boolean {
  return pathname === '/pro' || pathname.startsWith('/pro/');
}

/**
 * The settings section holding the content-export tools. The locked overlay
 * stands down here too, so its "Download my data" CTA leads somewhere usable.
 */
export function isDataExportRoute(pathname: string): boolean {
  return pathname === '/settings/migration' || pathname.startsWith('/settings/migration/');
}
