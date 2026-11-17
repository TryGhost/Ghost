import { z } from 'zod';

/** A Stripe object from an event's `data.object`, as Stripe sent it. */
export type StripeObject = Record<string, unknown>;

/** The Checkout session events Ghost handles. */
export type CheckoutSessionEventType =
  | 'checkout.session.completed'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed';

/** The subscription events Ghost handles. */
export type SubscriptionEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted';

/**
 * The data for each webhook event kind. Each kind has exactly one command that handles it (see
 * `WebhookController`). A Stripe event type that Ghost has no command for is `unhandled`.
 */
export interface WebhookEvents {
  checkout_session: { type: CheckoutSessionEventType; session: StripeObject };
  subscription: { type: SubscriptionEventType; subscription: StripeObject };
  invoice: { invoice: StripeObject };
  refund: { charge: StripeObject };
  unhandled: { type: string };
}

export type WebhookEventKind = keyof WebhookEvents;

/**
 * A webhook event of kind `K`, or of any kind. Written as a mapped type so a function that's
 * generic over `K` can look up the command for `event.kind` and call it with `event`, and the
 * types still check.
 */
export type WebhookEvent<K extends WebhookEventKind = WebhookEventKind> = {
  [P in K]: { kind: P } & WebhookEvents[P];
}[K];

/** The fields Ghost reads from every Stripe event: its id, type and API version. */
const Envelope = z
  .object({
    id: z.string().optional(),
    type: z.string(),
    api_version: z.string().nullish(),
  })
  .loose();

export type StripeEventEnvelope = z.output<typeof Envelope>;

const WithObject = z
  .object({ data: z.object({ object: z.record(z.string(), z.unknown()) }).loose() })
  .loose();

/** Builds the webhook event for each Stripe event type Ghost handles, from its `data.object`. */
const KINDS = new Map<string, (object: StripeObject) => WebhookEvent>([
  [
    'checkout.session.completed',
    (session) => ({ kind: 'checkout_session', type: 'checkout.session.completed', session }),
  ],
  [
    'checkout.session.async_payment_succeeded',
    (session) => ({
      kind: 'checkout_session',
      type: 'checkout.session.async_payment_succeeded',
      session,
    }),
  ],
  [
    'checkout.session.async_payment_failed',
    (session) => ({
      kind: 'checkout_session',
      type: 'checkout.session.async_payment_failed',
      session,
    }),
  ],
  [
    'customer.subscription.created',
    (subscription) => ({
      kind: 'subscription',
      type: 'customer.subscription.created',
      subscription,
    }),
  ],
  [
    'customer.subscription.updated',
    (subscription) => ({
      kind: 'subscription',
      type: 'customer.subscription.updated',
      subscription,
    }),
  ],
  [
    'customer.subscription.deleted',
    (subscription) => ({
      kind: 'subscription',
      type: 'customer.subscription.deleted',
      subscription,
    }),
  ],
  ['invoice.payment_succeeded', (invoice) => ({ kind: 'invoice', invoice })],
  ['charge.refunded', (charge) => ({ kind: 'refund', charge })],
]);

/** Reads the envelope of a Stripe event whose signature Ghost has verified. */
export function readEnvelope(verified: unknown): StripeEventEnvelope {
  return Envelope.parse(verified);
}

/**
 * Returns the webhook event for a verified Stripe event of `type`. Throws when an event of a type
 * Ghost handles has no `data.object`.
 */
export function toWebhookEvent(type: string, verified: unknown): WebhookEvent {
  const build = KINDS.get(type);
  return build ? build(WithObject.parse(verified).data.object) : { kind: 'unhandled', type };
}
