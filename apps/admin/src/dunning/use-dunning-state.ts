import { useEffect, useState } from 'react';
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
  paymentFailedAt: Date;
  suspendsAt: Date;
}

/**
 * The locked overlay takes over once this fraction of the
 * paymentFailedAt -> suspendsAt window has elapsed. Proportional rather than
 * an absolute day count so the same component fits any host's window length.
 */
const LOCK_AT_FRACTION = 0.5;

/** The warning banner escalates its styling past this fraction of the window. */
const URGENT_AT_FRACTION = 0.25;

/**
 * After clicking "Pay now" the dunning UI stands down for this long, so a
 * user who just paid is not chased by a stale warning while the payment
 * webhooks and the config rewrite catch up.
 */
export const PAYMENT_GRACE_MS = 10 * 60 * 1000;

const GRACE_STORAGE_KEY = 'ghost-dunning-grace-until';

function readGraceUntil(): number {
  try {
    const raw = window.sessionStorage.getItem(GRACE_STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    // Storage can be unavailable (private mode, blocked); no grace then.
    return 0;
  }
}

/**
 * Marks a payment attempt, starting the grace period. Called when the user
 * follows the "Pay now" CTA.
 */
export function markPaymentAttempt(): void {
  try {
    window.sessionStorage.setItem(GRACE_STORAGE_KEY, String(Date.now() + PAYMENT_GRACE_MS));
  } catch {
    // Without storage the grace period is simply not persisted.
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
 * misconfigured host config), a live subscription that has become active (the
 * billing app reports payment over the Ember bridge before the server config
 * catches up), or a recent "Pay now" click still within the grace period.
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

  if (!dunningWarningsEnabled) {
    return null;
  }

  const dunning = config?.config.hostSettings?.billing?.dunning;

  if (!dunning?.active) {
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

  if (now < readGraceUntil()) {
    return null;
  }

  const windowMs = suspendsAt.getTime() - paymentFailedAt.getTime();
  const elapsedFraction = (now - paymentFailedAt.getTime()) / windowMs;
  const daysLeft = Math.max(0, Math.ceil((suspendsAt.getTime() - now) / (24 * 60 * 60 * 1000)));

  return {
    phase: elapsedFraction >= LOCK_AT_FRACTION ? 'locked' : 'warning',
    daysLeft,
    urgent: elapsedFraction >= URGENT_AT_FRACTION,
    paymentFailedAt,
    suspendsAt,
  };
}
