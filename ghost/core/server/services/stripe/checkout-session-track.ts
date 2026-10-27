import logging from '@tryghost/logging';
import type { Tracer } from '../../lib/tracing/tracer';
import type { CheckoutSessionParts } from './checkout-session-params';

/**
 * Stripe refusing the publisher's design doesn't fail the checkout, which goes ahead in Stripe's
 * default design, so the refusal is only logged.
 */
const logRefusedDesign = (err: unknown) =>
  logging.error(
    { event: { name: 'stripe_checkout.design.refused' }, err },
    'Stripe refused the Stripe Checkout design',
  );

/**
 * `create` must call `onDesignRefused` when Stripe refuses the publisher's design and the
 * session is sent again without it.
 *
 * On a failure, `design` is `applied` when the request carrying the design failed for another
 * reason, and `refused` when a request sent again without the design failed.
 */
export function trackCheckoutSession<Session>(
  tracer: Tracer,
  parts: CheckoutSessionParts,
  create: (onDesignRefused: (err: unknown) => void) => Promise<Session>,
): Promise<Session> {
  return tracer.track('stripe_checkout.session', (span) => {
    span.setAttribute('design', parts.design ? 'applied' : 'none');
    return create((err) => {
      span.setAttribute('design', 'refused');
      logRefusedDesign(err);
    });
  });
}
