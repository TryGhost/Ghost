import type { Tracer } from '../../lib/tracing/tracer';
import {
  CHECKOUT_PARTS,
  type CheckoutPart,
  type CheckoutSessionParts,
  partName,
  type Refusal,
} from './checkout-session-params';

// The outcome span the Stripe API records, in one place: it reports what happened in its own
// terms, and this decides the span name and attributes dashboards read.

/** What creating a Checkout session reports about its attempt. */
interface CheckoutSessionAttempt {
  /** Stripe refused parts of the checkout, and the session is sent again without them. */
  refused(refusal: Refusal): void;
}

/** How a part of the checkout fared in a session. */
type PartOutcome = 'applied' | 'none' | 'refused' | 'dropped';

export type StripeTracking = ReturnType<typeof stripeTracking>;

export function stripeTracking(tracer: Tracer) {
  return {
    /**
     * Each Checkout session Ghost creates for a buyer records one span, with an attribute for
     * each part of the checkout: `applied` when the session was sent with it, `none` when the
     * checkout has no such part, `refused` when Stripe refused it by name and the session was
     * sent again without it, and `dropped` when Stripe refused the session without naming any
     * parameter, so it was sent again without any of the checkout's parts.
     *
     * On a failure, a part is `applied` when the request carrying it failed for another reason,
     * and `refused` or `dropped` when a request sent again without it failed. A session that
     * failed with its parts dropped was refused for something other than the checkout's parts.
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
