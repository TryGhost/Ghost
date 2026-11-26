import { z } from 'zod';
import { firstError } from '../../../lib/first-error';
import { UNREADABLE_RESPONSE } from '../stripe-api-responses';

/**
 * Who can fix a failed webhook event:
 *
 * - `ghost`: the failure is a bug in Ghost, or hasn't been classified yet. That includes Stripe
 *   returning an object Ghost can't read, which means Ghost's expectations of Stripe are wrong.
 * - `dependency`: Stripe is unavailable, rate limits Ghost, or returns a lock timeout. Ghost chose
 *   Stripe as a dependency and retries these, so they count against Ghost's objectives.
 * - `site`: the publisher's setup caused the failure: their Stripe account, its connection to
 *   Ghost, or something they created in the Stripe dashboard.
 */
export type Owner = 'ghost' | 'dependency' | 'site';

/**
 * The reasons a webhook event can fail, each with who can fix it and whether the failure is
 * reported to Sentry. Ghost's Sentry setup also drops every Ghost error whose status isn't 500.
 */
export const FAILURES = {
  webhook_secret_missing: { owner: 'site', sentry: true },
  signature_mismatch: { owner: 'site', sentry: true },
  stripe_access_revoked: { owner: 'site', sentry: false },
  stripe_unavailable: { owner: 'dependency', sentry: true },
  no_member_for_customer: { owner: 'site', sentry: true },
  unsupported_subscription: { owner: 'site', sentry: true },
  // A checkout whose buyer Ghost can't record anything under: a Stripe customer deleted, or left
  // without an email address, since the buyer paid, or a donation without the donor's email. It's
  // the site's Stripe data, and Ghost can't fix it, so the failure is counted by its reason and
  // owner on the webhook's span rather than reported.
  unusable_customer: { owner: 'site', sentry: false },
  unreadable_stripe_response: { owner: 'ghost', sentry: true },
  unreadable_stripe_event: { owner: 'ghost', sentry: true },
  unclassified: { owner: 'ghost', sentry: true },
} as const satisfies Record<string, { owner: Owner; sentry: boolean }>;

export type FailureReason = keyof typeof FAILURES;

export interface Failure {
  reason: FailureReason;
  owner: Owner;
  sentry: boolean;
}

/** The error codes Ghost sets on webhook errors whose reason it knows. */
export const FAILURE_CODES = {
  webhookSecretMissing: 'STRIPE_WEBHOOK_SECRET_MISSING',
  signatureMismatch: 'STRIPE_WEBHOOK_SIGNATURE_MISMATCH',
  noMemberForCustomer: 'STRIPE_WEBHOOK_NO_MEMBER_FOR_CUSTOMER',
  unsupportedSubscription: 'STRIPE_WEBHOOK_UNSUPPORTED_SUBSCRIPTION',
  unusableCustomer: 'STRIPE_WEBHOOK_UNUSABLE_CUSTOMER',
  unreadableEvent: 'STRIPE_WEBHOOK_UNREADABLE_EVENT',
} as const;

/**
 * The reason for each code Ghost sets: the webhook's own, and the Stripe client's code for a
 * response Ghost can't read.
 */
const REASON_OF_CODE: ReadonlyMap<string, FailureReason> = new Map([
  [FAILURE_CODES.webhookSecretMissing, 'webhook_secret_missing'],
  [FAILURE_CODES.signatureMismatch, 'signature_mismatch'],
  [FAILURE_CODES.noMemberForCustomer, 'no_member_for_customer'],
  [FAILURE_CODES.unsupportedSubscription, 'unsupported_subscription'],
  [FAILURE_CODES.unusableCustomer, 'unusable_customer'],
  [FAILURE_CODES.unreadableEvent, 'unreadable_stripe_event'],
  [UNREADABLE_RESPONSE, 'unreadable_stripe_response'],
]);

/**
 * The reason for each Stripe error class that Ghost can't fix. Stripe's client sets an error's
 * `type` to its class name. Any other class, such as an invalid request error, means Ghost sent
 * Stripe a bad request.
 */
const REASON_OF_STRIPE_ERROR: ReadonlyMap<string, FailureReason> = new Map([
  ['StripeAuthenticationError', 'stripe_access_revoked'],
  ['StripePermissionError', 'stripe_access_revoked'],
  ['StripeRateLimitError', 'stripe_unavailable'],
  ['StripeConnectionError', 'stripe_unavailable'],
  ['StripeAPIError', 'stripe_unavailable'],
]);

const Coded = z.object({ code: z.string() });
const StripeTyped = z.object({ type: z.string() });

/**
 * Classifies a webhook failure by the error Ghost reads from what was thrown (see `firstError`):
 * by its code, which Ghost sets when it knows the reason, or by Stripe's error class. Any other
 * error is `unclassified` and counts as Ghost's, so a failure only stops counting against Ghost
 * once the code that throws it sets a reason.
 */
export function classifyFailure(thrown: unknown): Failure {
  const err = firstError(thrown);
  const code = Coded.safeParse(err);
  const stripeError = StripeTyped.safeParse(err);
  const reason =
    (code.success ? REASON_OF_CODE.get(code.data.code) : undefined) ??
    (stripeError.success ? REASON_OF_STRIPE_ERROR.get(stripeError.data.type) : undefined) ??
    'unclassified';
  return { reason, ...FAILURES[reason] };
}
