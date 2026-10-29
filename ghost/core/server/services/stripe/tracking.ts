import type { Tracer } from '../../lib/tracing/tracer';
import type { CheckoutSessionParts } from './checkout-session-params';

// The outcome span the Stripe API records, in one place: it reports what happened in its own
// terms, and this decides the span name and attributes dashboards read.

/** What creating a Checkout session reports about its attempt. */
interface CheckoutSessionAttempt {
  /** Stripe refused the publisher's design, and the session is sent again without it. */
  designRefused(): void;
}

export type StripeTracking = ReturnType<typeof stripeTracking>;

export function stripeTracking(tracer: Tracer) {
  return {
    /**
     * Each Checkout session Ghost creates for a buyer records one span.
     *
     * On a failure, `design` is `applied` when the request carrying the design failed for another
     * reason, and `refused` when a request sent again without the design failed.
     */
    checkoutSession<Session>(
      parts: CheckoutSessionParts,
      create: (attempt: CheckoutSessionAttempt) => Promise<Session>,
    ): Promise<Session> {
      return tracer.track('stripe_checkout.session', (span) => {
        span.setAttribute('design', parts.design ? 'applied' : 'none');
        return create({
          designRefused() {
            span.setAttribute('design', 'refused');
          },
        });
      });
    },
  };
}
