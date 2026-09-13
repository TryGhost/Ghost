import { useEffect, useState, useSyncExternalStore } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useSubscriptionStatus } from '@/ember-bridge';

export type DunningPhase = 'warning' | 'locked';

export interface DunningState {
  phase: DunningPhase;
  /** Whole days until suspension, never negative. */
  daysLeft: number;
  /** Escalated styling within the warning phase (last stretch before the lock). */
  urgent: boolean;
  /** The locked takeover was stood down this session (closed, or a Pay now CTA followed). */
  lockDismissed: boolean;
  paymentFailedAt: Date;
  suspendsAt: Date;
}

/**
 * The locked overlay takes over once this fraction of the
 * paymentFailedAt -> suspendsAt window has elapsed. Proportional rather than
 * an absolute day count so the same component fits any host's window length.
 */
const LOCK_AT_FRACTION = 0.75;

/** The warning banner escalates its styling past this fraction of the window. */
const URGENT_AT_FRACTION = 0.25;

const LOCK_DISMISSED_KEY = 'ghost-dunning-lock-dismissed-for';

const lockDismissListeners = new Set<() => void>();

// Fallback when sessionStorage is unavailable, so dismissing still works for
// the lifetime of the page.
let inMemoryLockDismissedFor: string | null = null;

function readLockDismissedFor(): string | null {
  try {
    return window.sessionStorage.getItem(LOCK_DISMISSED_KEY);
  } catch {
    return inMemoryLockDismissedFor;
  }
}

function subscribeLockDismissed(listener: () => void): () => void {
  lockDismissListeners.add(listener);
  return () => {
    lockDismissListeners.delete(listener);
  };
}

function writeLockDismissedFor(state: DunningState): void {
  inMemoryLockDismissedFor = state.paymentFailedAt.toISOString();
  try {
    window.sessionStorage.setItem(LOCK_DISMISSED_KEY, inMemoryLockDismissedFor);
  } catch {
    // Storage can be unavailable; the in-memory fallback covers this page.
  }
}

/**
 * Stands the locked takeover down for this session, swapping it out for the
 * urgent warning banner right away. Keyed by `paymentFailedAt` and scoped to
 * the session, so a later session — or a new payment failure — brings the
 * takeover back.
 */
export function dismissLock(state: DunningState): void {
  writeLockDismissedFor(state);
  lockDismissListeners.forEach((listener) => listener());
}

/**
 * The "Pay now" variant of dismissLock: records the suppression without
 * forcing an immediate re-render. The click is followed by navigation to the
 * billing route, where the takeover and banner stand down anyway — an eager
 * swap would flash the underlying screen with the warning banner for a frame
 * before the route change lands. useSyncExternalStore re-reads its snapshot
 * on every render, so the route change itself picks the stored value up.
 */
export function dismissLockQuietly(state: DunningState): void {
  writeLockDismissedFor(state);
}

/**
 * Records the route a "Pay now" CTA was clicked on. The billing app's
 * post-payment `previousPage` request is resolved from this on the Ember
 * side — an explicit route rather than history.back(), so a deep link (or a
 * tab whose history points outside Admin) falls back to the billing overview
 * instead of leaving Ghost.
 */
const PAY_RETURN_ROUTE_KEY = 'ghost-dunning-pay-return-route';

export function markPayNowReturnRoute(route: string): void {
  try {
    window.sessionStorage.setItem(PAY_RETURN_ROUTE_KEY, route);
  } catch {
    // Without storage the post-payment return falls back to the overview.
  }
}

/**
 * Written by the Ember billing service when the billing app reports a
 * completed payment (its `previousPage` return request only follows one).
 * Read here so the warnings stand down the moment the user lands back,
 * rather than lingering until the webhook-settled subscription state
 * arrives seconds later. The return navigation triggers the render that
 * picks the value up — no notification needed.
 */
const PAYMENT_SETTLED_KEY = 'ghost-dunning-payment-settled-at';

function readPaymentSettledAt(): string | null {
  try {
    return window.sessionStorage.getItem(PAYMENT_SETTLED_KEY);
  } catch {
    return null;
  }
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Payment-failure (dunning) state for the site's hosting subscription, derived
 * from host-provided config (`hostSettings.billing.dunning`).
 *
 * Returns `null` when there is nothing to show: no dunning block, a malformed
 * one (the /config/ response isn't runtime-validated, so guard against a
 * misconfigured host config), or a live subscription that has become active
 * (the billing app reports payment over the Ember bridge before the server
 * config catches up).
 *
 * The phase is computed client-side from the position within the
 * paymentFailedAt -> suspendsAt window so no config rewrite is needed for the
 * warning -> locked transition.
 */
export function useDunningState(): DunningState | null {
  const { data: config } = useBrowseConfig();
  const subscriptionStatus = useSubscriptionStatus();
  // Labs-gated while in development: hosts can ship and test the config
  // pipeline without end users seeing any dunning UI.
  const dunningWarningsEnabled = useFeatureFlag('dunningWarnings');

  // Re-derive the phase and countdown periodically; transitions land on date
  // boundaries, so a coarse tick keeps them fresh without churn.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const lockDismissedFor = useSyncExternalStore(subscribeLockDismissed, readLockDismissedFor);
  const paymentSettledAt = useSyncExternalStore(subscribeLockDismissed, readPaymentSettledAt);

  if (!dunningWarningsEnabled) {
    return null;
  }

  const dunning = config?.config.hostSettings?.billing?.dunning;

  // Strict comparison: the /config/ response isn't runtime-validated, and a
  // misconfigured host sending e.g. active: "false" must stay a no-op
  if (dunning?.active !== true) {
    return null;
  }

  const paymentFailedAt = parseDate(dunning.paymentFailedAt);
  const suspendsAt = parseDate(dunning.suspendsAt);

  if (!paymentFailedAt || !suspendsAt || suspendsAt.getTime() <= paymentFailedAt.getTime()) {
    return null;
  }

  // The billing app reported a live, active subscription: payment went
  // through, only the restart-scoped config is stale.
  if (subscriptionStatus?.subscription?.status === 'active') {
    return null;
  }

  // A payment completed this session, after this failure: the billing app is
  // still settling webhooks in the background, but the outcome is known — no
  // warning should greet the user on their way back. A later failure carries
  // a newer paymentFailedAt and re-arms everything.
  const settledAt = parseDate(paymentSettledAt ?? undefined);
  if (settledAt && settledAt.getTime() > paymentFailedAt.getTime()) {
    return null;
  }

  const windowMs = suspendsAt.getTime() - paymentFailedAt.getTime();
  const elapsedFraction = (now - paymentFailedAt.getTime()) / windowMs;
  const daysLeft = Math.max(0, Math.ceil((suspendsAt.getTime() - now) / (24 * 60 * 60 * 1000)));

  return {
    phase: elapsedFraction >= LOCK_AT_FRACTION ? 'locked' : 'warning',
    daysLeft,
    urgent: elapsedFraction >= URGENT_AT_FRACTION,
    lockDismissed: lockDismissedFor === paymentFailedAt.toISOString(),
    paymentFailedAt,
    suspendsAt,
  };
}
