import type { Tracer } from '../../lib/tracing/tracer';
import {
  CHECKOUT_PARTS,
  type CheckoutPart,
  type CheckoutSessionParts,
  partName,
  type Refusal,
} from './checkout-session-params';

// The spans that record how buyers' Stripe Checkouts go. Their names and attributes are defined
// here, in one place, because the Stripe Checkout dashboard in TryGhost/k8s queries them by name:
// renaming a span or an attribute breaks the dashboard until it's changed to match.
//
// Two parts of Ghost record these spans. The members API's router records a
// `stripe_checkout.start` span for each checkout a buyer starts, and `StripeAPI` records a
// `stripe_checkout.session` span for each Checkout session it asks Stripe to create. Neither
// touches its span. Each is handed an attempt object and reports to it what happened, in terms of
// the checkout, and the functions below decide how each report is recorded on the span.

type CheckoutType = 'subscription' | 'donation' | 'gift';

/** What the members API reports to a `stripe_checkout.start` span while it starts a checkout. */
interface CheckoutAttempt {
  /** Called once the members API knows Ghost offers the kind of checkout the buyer asked for. */
  starting(type: CheckoutType): void;
}

/** What `StripeAPI` reports to a `stripe_checkout.session` span while it creates a session. */
interface CheckoutSessionAttempt {
  /**
   * Called each time Stripe rejects the request for a session because of the parts of the
   * checkout in `refusal`, just before Ghost sends the request again without those parts.
   */
  refused(refusal: Refusal): void;
}

/**
 * What happened to one part of a checkout while Ghost created its Checkout session. A checkout's
 * parts are its design and each thing the publisher has it ask the buyer for, such as a phone
 * number or a tax ID.
 *
 * - `applied`: the last request Ghost sent Stripe for the session included the part.
 * - `none`: the publisher hasn't set the part up, so no request included it.
 * - `refused`: Stripe rejected a request and named the part's parameter as the reason, so Ghost
 *   sent the request again without the part.
 * - `dropped`: Stripe rejected a request without naming a parameter, so Ghost couldn't tell which
 *   part was the reason and sent the request again without any of them.
 */
type PartOutcome = 'applied' | 'none' | 'refused' | 'dropped';

export type StripeTracking = ReturnType<typeof stripeTracking>;

export function stripeTracking(tracer: Tracer) {
  return {
    /**
     * Records one `stripe_checkout.start` span for each request a buyer makes to start a
     * checkout. The span runs from the checkout endpoint starting on the request to the endpoint
     * answering with the Checkout link, so the span sees every failure that stops a checkout,
     * including those that happen before Ghost asks Stripe for a session, which the
     * `stripe_checkout.session` span never sees. The endpoint starts once the request's JSON body
     * has been parsed and the rate limits checked, so a request turned away before then, such as
     * one whose body isn't JSON, isn't a checkout and records no span.
     *
     * When Ghost refuses the request, the span fails with the refusal's error type, such as
     * `BadRequestError` for a tier that doesn't exist, so the dashboard can count refusals
     * separately from failures. The `type` attribute holds the kind of checkout. A request for a
     * kind Ghost doesn't offer is refused before `type` is set, so its span has no `type`.
     */
    checkout<Result>(start: (attempt: CheckoutAttempt) => Promise<Result>): Promise<Result> {
      return tracer.track('stripe_checkout.start', (span) =>
        start({ starting: (type) => span.setAttribute('type', type) }),
      );
    },

    /**
     * Records one `stripe_checkout.session` span for each Checkout session Ghost asks Stripe to
     * create for a buyer, with one attribute per part of the checkout saying what happened to
     * that part (see `PartOutcome`).
     *
     * When Stripe fails the session, the span's attributes describe the last request Ghost sent,
     * which is the one that failed. A part that is still `applied` was in that request, so
     * Stripe failed the request for a reason other than refusing that part. When no part is
     * `applied`, the failed request carried none of the publisher's checkout settings, so those
     * settings weren't the reason it failed.
     */
    checkoutSession<Session>(
      parts: CheckoutSessionParts,
      create: (attempt: CheckoutSessionAttempt) => Promise<Session>,
    ): Promise<Session> {
      return tracer.track('stripe_checkout.session', (span) => {
        const record = (part: CheckoutPart, outcome: PartOutcome) =>
          span.setAttribute(partName(part), outcome);
        for (const part of CHECKOUT_PARTS) {
          record(part, parts[part] ? 'applied' : 'none');
        }
        return create({
          refused(refusal) {
            if (refusal.named) {
              record(refusal.part, 'refused');
            } else {
              refusal.parts.forEach((part) => record(part, 'dropped'));
            }
          },
        });
      });
    },
  };
}
