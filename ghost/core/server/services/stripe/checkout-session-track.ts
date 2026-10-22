import { z } from 'zod';
import { defineTrack, type Metrics } from '../../lib/metrics/track';
import type { CheckoutSessionParts } from './checkout-session-params';

/**
 * One attempt at creating a buyer's Checkout session, recorded when Stripe answers: `success`
 * once Stripe creates it, `failure` with the error's code when it doesn't. Previews aren't a
 * buyer's sessions and aren't recorded.
 */
export const CheckoutSession = defineTrack({
  name: 'stripe_checkout.session',
  tags: z.object({
    /**
     * The publisher's design: `none` when there's none to send, `applied` when the session was
     * sent in it, and `refused` when Stripe refused it and the session was sent again in
     * Stripe's default design. On a failure it is what the request that failed was sent with,
     * so `applied` there means Stripe failed the session for another reason before taking or
     * refusing the design.
     */
    design: z.enum(['none', 'applied', 'refused']),
  }),
  events: ['design_refused'],
});

/**
 * Creates a buyer's Checkout session with `create`, recording its outcome and its design.
 * `create` calls the callback it's given when Stripe refuses the design, before sending the
 * session again without it.
 */
export function trackCheckoutSession<Session>(
  metrics: Metrics,
  parts: CheckoutSessionParts,
  create: (onDesignRefused: (err: unknown) => void) => Promise<Session>,
): Promise<Session> {
  return metrics.track(CheckoutSession, (session) => {
    session.tag('design', parts.design ? 'applied' : 'none');
    return create((err) => {
      session.tag('design', 'refused');
      session.log.error('design_refused', { err }, 'Stripe refused the Stripe Checkout design');
    });
  });
}
