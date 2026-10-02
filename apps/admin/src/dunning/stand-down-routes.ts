/**
 * Routes where the dunning surfaces stand down so their own content stays
 * usable — the takeover on both, the banner on the billing routes only.
 */

/**
 * The billing app's own routes: the dunning UI stands down there so the user
 * can actually reach the payment form (and the billing app shows its own
 * outstanding-invoice state).
 */
export function isBillingRoute(pathname: string): boolean {
  return pathname === '/pro' || pathname.startsWith('/pro/');
}

/**
 * The settings section holding the content-export tools — also the target of
 * the takeover's "Download my data" CTA, so the two stay in step.
 */
export const DATA_EXPORT_ROUTE = '/settings/migration';

/**
 * The locked overlay stands down on the export tools too, so its
 * "Download my data" CTA leads somewhere usable.
 */
export function isDataExportRoute(pathname: string): boolean {
  return pathname === DATA_EXPORT_ROUTE || pathname.startsWith(`${DATA_EXPORT_ROUTE}/`);
}
