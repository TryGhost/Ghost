import {
  DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
  DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY,
  parseDunningConfig,
} from '@tryghost/admin-x-framework/api/dunning';
import { z } from 'zod';
import type { SubscriptionState } from './subscription-status';

export const BILLING_ROUTE_ROOT = '/pro';

/** Messages the billing app posts to Admin. Every field is untrusted input. */
export interface BillingAppMessage {
  subscription?: unknown;
  request?: unknown;
  route?: unknown;
  destination?: unknown;
  exceededLimits?: unknown;
}

type BillingSubscription = NonNullable<SubscriptionState['subscription']>;

// Only a status is required: a report the app shapes differently must still
// lift a force upgrade, so malformed optional fields fall back instead
const billingSubscriptionSchema = z.object({
  status: z.string(),
  isActiveTrial: z.boolean().catch(false),
  trial_end: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)))
    .nullable()
    .catch(null),
});

/** The subscription a billing app report carries, or null when it has no usable status. */
export function parseBillingSubscription(value: unknown): BillingSubscription | null {
  const result = billingSubscriptionSchema.safeParse(value);
  return result.success ? result.data : null;
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
 * The billing app route the iframe loads for an Admin URL, as Ember's pro
 * routes queue it before the iframe exists: a child route loads without its
 * query, and non-billing pages load the root.
 */
export function initialBillingSubRoute(pathname: string): string | null {
  if (!isBillingPath(pathname)) {
    return null;
  }
  return billingSubRoute(pathname) ?? '/';
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
    automations: '/automations',
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

/** `paymentFailedAt` of the failure a completed payment settled this session. */
export function readDunningPaymentSettledFor(): string | null {
  try {
    return window.sessionStorage.getItem(DUNNING_PAYMENT_SETTLED_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function activeDunning(
  value: unknown,
  {
    subscriptionStatus,
    paymentSettledFor,
  }: {
    subscriptionStatus: unknown;
    paymentSettledFor: string | null;
  },
) {
  const dunning = parseDunningConfig(value);

  if (
    !dunning ||
    subscriptionStatus === 'active' ||
    paymentSettledFor === dunning.paymentFailedAt.toISOString()
  ) {
    return null;
  }

  return dunning;
}

export const EXCEEDED_ALERT_KEY = 'billing.exceeded';

export const EXCEEDED_ALERT_HTML = `Your audience has grown! To continue publishing, the site owner must <a href="#${BILLING_ROUTE_ROOT}/plans">confirm pricing for this number of members</a>.`;

export function billingAlerts(message: { exceededLimits?: unknown }): {
  exceeded: boolean;
} {
  const exceededLimits = Array.isArray(message.exceededLimits) ? message.exceededLimits : [];

  return {
    exceeded: exceededLimits.includes('members'),
  };
}
