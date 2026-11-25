import { z } from 'zod';
import { StripeName } from '../codecs';

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
 * Why the webhook ignores a verified event:
 *
 * - `unhandled_type`: Ghost has no command for the event's type.
 * - `listed_customer`: the event's customer is in the `stripeWebhookCustomerIgnoreList` config.
 * - `payment_failed`: the asynchronous payment for a Checkout session failed.
 * - `gift_not_paid`: a gift checkout completed, but Stripe hasn't received the payment yet. Ghost
 *   completes the gift when the `checkout.session.async_payment_succeeded` event arrives.
 * - `not_a_gift`: a delayed payment arrived for a Checkout session that isn't a gift. Only gifts
 *   wait for their payment: Ghost records a donation, or starts a subscription, when the checkout
 *   completes.
 * - `not_a_ghost_checkout`: a Checkout session Ghost didn't create, such as a Stripe Payment Link
 *   sale, which is neither a subscription, a card update, a gift nor a donation.
 * - `conflicting_checkout_markers`: a Checkout session marked as both a gift and a donation.
 */
export type IgnoreReason =
  | 'unhandled_type'
  | 'listed_customer'
  | 'payment_failed'
  | 'gift_not_paid'
  | 'not_a_gift'
  | 'not_a_ghost_checkout'
  | 'conflicting_checkout_markers';

/**
 * The data for each webhook event kind. Each kind has exactly one command that handles it (see
 * `WebhookController`). An event Ghost doesn't act on is `ignored`, with the reason.
 */
export interface WebhookEvents {
  subscription_checkout: { session: CheckoutSessionObject };
  card_update_checkout: { session: CheckoutSessionObject };
  gift_checkout: { session: CheckoutSessionObject };
  donation_checkout: { session: CheckoutSessionObject };
  subscription: { type: SubscriptionEventType; subscription: StripeObject };
  invoice: { invoice: StripeObject };
  refund: { charge: StripeObject };
  ignored: { reason: IgnoreReason };
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

/**
 * A Checkout session as the webhook reads it from Stripe, with the buyer's names shortened to
 * fit: `customer_details.name`, the name they gave Stripe, and `metadata.name`, the name they gave
 * the site's signup form, which Ghost passes to Stripe when it creates the session. Every other
 * field passes through as Stripe sent it.
 */
const CheckoutSessionObject = z
  .object({
    customer_details: z.object({ name: StripeName.nullish() }).loose().nullish(),
    metadata: z.object({ name: StripeName.optional() }).loose().nullish(),
  })
  .loose();

export type CheckoutSessionObject = z.output<typeof CheckoutSessionObject>;

const isTrue = (value: unknown) => value === true || value === 'true';

/**
 * What decides which kind of checkout a Checkout session is: its mode, whether it's paid, and the
 * markers Ghost puts in the metadata of the gift and donation sessions it creates. A gift is
 * marked by `ghost_gift_id`, or by `ghost_gift` on older gift sessions, and a donation by
 * `ghost_donation`. A session that has a `ghost_donation` key and a gift marker is
 * marked as both, whatever the key's value.
 */
const CheckoutSession = z
  .object({
    mode: z.string().nullish(),
    payment_status: z.string().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
  })
  .loose()
  .transform(({ mode, payment_status: paymentStatus, metadata }) => {
    const markers = metadata ?? {};
    const gift = Object.hasOwn(markers, 'ghost_gift_id') || isTrue(markers.ghost_gift);
    return {
      mode,
      paid: paymentStatus === 'paid',
      gift,
      donation: isTrue(markers.ghost_donation),
      conflicting: gift && Object.hasOwn(markers, 'ghost_donation'),
    };
  });

const ignored = (reason: IgnoreReason): WebhookEvent => ({ kind: 'ignored', reason });

/**
 * The webhook event for a Checkout session event. A completed session in `setup` mode saves a
 * member's new card, and one in `subscription` mode is a paid signup or upgrade. A session in
 * `payment` mode is a gift or a donation, by its markers. A gift paid with a method that settles
 * later completes on `checkout.session.async_payment_succeeded`, so only a paid gift is completed.
 * The event carries the session with the buyer's names shortened to fit what Ghost stores.
 */
function checkoutEvent(type: CheckoutSessionEventType, received: StripeObject): WebhookEvent {
  if (type === 'checkout.session.async_payment_failed') {
    return ignored('payment_failed');
  }
  const session = CheckoutSessionObject.parse(received);
  const { mode, paid, gift, donation, conflicting } = CheckoutSession.parse(session);
  if (type === 'checkout.session.async_payment_succeeded') {
    if (mode !== 'payment' || !gift) {
      return ignored('not_a_gift');
    }
  } else {
    if (mode === 'setup') {
      return { kind: 'card_update_checkout', session };
    }
    if (mode === 'subscription') {
      return { kind: 'subscription_checkout', session };
    }
    if (mode !== 'payment' || !(gift || donation)) {
      return ignored('not_a_ghost_checkout');
    }
  }
  if (conflicting) {
    return ignored('conflicting_checkout_markers');
  }
  if (gift) {
    return paid ? { kind: 'gift_checkout', session } : ignored('gift_not_paid');
  }
  return { kind: 'donation_checkout', session };
}

/** Builds the webhook event for each Stripe event type Ghost handles, from its `data.object`. */
const KINDS = new Map<string, (object: StripeObject) => WebhookEvent>([
  ['checkout.session.completed', (session) => checkoutEvent('checkout.session.completed', session)],
  [
    'checkout.session.async_payment_succeeded',
    (session) => checkoutEvent('checkout.session.async_payment_succeeded', session),
  ],
  [
    'checkout.session.async_payment_failed',
    (session) => checkoutEvent('checkout.session.async_payment_failed', session),
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
  return build ? build(WithObject.parse(verified).data.object) : ignored('unhandled_type');
}
