import {
  DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
  DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY,
} from '@tryghost/admin-x-framework/api/dunning';
import type { SubscriptionState } from '@/ember-bridge';

export const BILLING_ROUTE_ROOT = '/pro';

/** Messages the billing app posts to Admin. Every field is untrusted input. */
export interface BillingAppMessage extends SubscriptionState {
  request?: unknown;
  route?: unknown;
  destination?: unknown;
  checkoutRoute?: unknown;
  exceededLimits?: unknown;
}

export function isBillingPath(pathname: string): boolean {
  return pathname === BILLING_ROUTE_ROOT || pathname.startsWith(`${BILLING_ROUTE_ROOT}/`);
}

/** The billing app route an Admin path shows: `/pro/domain` → `/domain`, `/pro` → null. */
export function billingSubRoute(pathname: string): string | null {
  if (!isBillingPath(pathname)) {
    return null;
  }
  return pathname.slice(BILLING_ROUTE_ROOT.length).replace(/\/$/, '') || null;
}

/** The Admin path for a billing app route: `/domain` → `/pro/domain`, `/` → `/pro`. */
export function billingAdminPath(subRoute: string): string {
  return subRoute === '/' ? BILLING_ROUTE_ROOT : `${BILLING_ROUTE_ROOT}${subRoute}`;
}

/**
 * A billing app route as reported by the app: a path, never a URL, and never
 * one with dot segments — the router resolves `/pro/../x` to `/x`, which would
 * let a route report reach any Admin screen.
 */
export function isBillingAppRoute(route: unknown): route is string {
  if (
    typeof route !== 'string' ||
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.includes('\\')
  ) {
    return false;
  }
  const segments = route.split(/[?#]/)[0].split('/');
  return !segments.some((segment) => /^(\.|%2e){1,2}$/i.test(segment));
}

const NEWSLETTERS_DESTINATION = 'newsletters';
export const PREVIOUS_PAGE_DESTINATION = 'previousPage';

// Admin owns the mapping: the billing app only ever names a destination. A
// null-prototype object so untrusted keys like '__proto__' cannot resolve.
const ADMIN_DESTINATION_ROUTES: Record<string, string> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, string>, {
    theme: '/settings/design/change-theme',
    analytics: '/settings/analytics',
    staff: '/settings/staff',
    stripe: '/settings/stripe-connect',
    integrations: '/settings/integrations',
  }),
);

/** The Admin route for an approved billing app destination, or null. */
export function adminDestinationRoute(
  destination: unknown,
  { automations }: { automations: boolean },
): string | null {
  if (typeof destination !== 'string') {
    return null;
  }
  if (destination === NEWSLETTERS_DESTINATION) {
    return automations ? '/settings/emails' : '/settings/newsletters';
  }
  return ADMIN_DESTINATION_ROUTES[destination] ?? null;
}

/**
 * Consumes the route recorded by a dunning "Pay now" CTA — once per payment
 * return. Absolute Admin paths only: '//host' is a protocol-relative URL.
 */
export function takePayNowReturnRoute(): string | null {
  try {
    const route = window.sessionStorage.getItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY);
    window.sessionStorage.removeItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY);
    return route && route.startsWith('/') && !route.startsWith('//') ? route : null;
  } catch {
    return null;
  }
}

/** Identifies the settled failure by the boot config's timestamp, never the browser clock. */
export function markDunningPaymentSettled(paymentFailedAt: Date): void {
  try {
    window.sessionStorage.setItem(
      DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
      paymentFailedAt.toISOString(),
    );
  } catch {
    // Without storage the warnings stand down when the refreshed subscription state arrives
  }
}

export const OVERDUE_ALERT_KEY = 'billing.overdue';
export const EXCEEDED_ALERT_KEY = 'billing.exceeded';

export const OVERDUE_ALERT_HTML = `Your billing details need updating. The site owner must <a href="#${BILLING_ROUTE_ROOT}/update-card">update payment information</a> to avoid suspension.`;
export const EXCEEDED_ALERT_HTML = `Your audience has grown! To continue publishing, the site owner must <a href="#${BILLING_ROUTE_ROOT}?action=checkout">confirm pricing for this number of members</a>.`;

/**
 * Which billing alerts a subscription report calls for. The dunning warnings
 * replace the overdue alert, but only while they can use the host's dunning
 * config — otherwise the overdue alert must stay available.
 */
export function billingAlerts(
  message: BillingAppMessage,
  { dunningWarningsActive }: { dunningWarningsActive: boolean },
): { overdue: boolean; exceeded: boolean } {
  const status = message.subscription?.status;
  const exceededLimits = Array.isArray(message.exceededLimits) ? message.exceededLimits : [];

  return {
    overdue: (status === 'past_due' || status === 'unpaid') && !dunningWarningsActive,
    exceeded: exceededLimits.includes('members') && Boolean(message.checkoutRoute),
  };
}
