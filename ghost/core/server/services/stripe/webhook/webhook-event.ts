import errors from '@tryghost/errors';
import { z } from 'zod';
import { StripeBuyerEmail } from '../../gifts/gift-service';
import { StripeName } from '../codecs';
import { FAILURE_CODES } from './failures';

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
 * - `another_site`: another Ghost site on the same Stripe account created the Checkout session.
 * - `listed_customer`: the event's customer is in the `stripeWebhookCustomerIgnoreList` config.
 * - `payment_failed`: the asynchronous payment for a Checkout session failed.
 * - `gift_not_paid`: a gift checkout completed, but Stripe hasn't received the payment yet. Ghost
 *   completes the gift when the `checkout.session.async_payment_succeeded` event arrives.
 * - `not_a_gift`: a delayed payment arrived for a Checkout session that isn't a gift. Only gifts
 *   wait for their payment: Ghost records a donation, or starts a subscription, when the checkout
 *   completes.
 * - `not_a_ghost_checkout`: a Checkout session Ghost didn't create, such as a Stripe Payment Link
 *   sale, which is neither a subscription, a card update, a gift nor a donation. Also a card
 *   update whose setup intent Ghost didn't create, such as another app's on the same Stripe
 *   account, as its metadata names no Stripe customer.
 * - `conflicting_checkout_markers`: a Checkout session marked as both a gift and a donation.
 */
export type IgnoreReason =
  | 'unhandled_type'
  | 'another_site'
  | 'listed_customer'
  | 'payment_failed'
  | 'gift_not_paid'
  | 'not_a_gift'
  | 'not_a_ghost_checkout'
  | 'conflicting_checkout_markers';

/**
 * An event Ghost doesn't act on, with the reason. An event ignored for its customer being on the
 * ignore list names the customer, which the webhook logs.
 */
export type Ignored =
  | { reason: Exclude<IgnoreReason, 'listed_customer'> }
  | { reason: 'listed_customer'; customerId: string };

/**
 * The data for each webhook event kind: the input its command takes, named after the kind. Each
 * kind has exactly one command that handles it (see `WebhookController`). An event Ghost doesn't
 * act on is `ignored`, with the reason.
 */
export interface WebhookEvents {
  subscription_checkout: { session: CheckoutSessionObject };
  card_update_checkout: CardUpdateCheckout;
  gift_checkout: GiftCheckout;
  donation_checkout: DonationCheckout;
  subscription: Subscription;
  invoice: Invoice;
  refund: Refund;
  ignored: Ignored;
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

/**
 * What the webhook needs to know about the site that receives each event: its uuid, which tells
 * the Checkout sessions it created from other sites', and the Stripe customers whose subscription
 * updates it ignores, from the `stripeWebhookCustomerIgnoreList` config.
 */
export interface WebhookSite {
  siteUuid: string;
  listedCustomers: ReadonlySet<string>;
}

/** An event with its object, which every event type Ghost handles has. */
const WithObject = z
  .object({ data: z.object({ object: z.record(z.string(), z.unknown()) }).loose() })
  .loose();

/**
 * Reads what Stripe sent for an event of `type` with `schema`. An event Ghost can't read fails
 * here, naming its type and the fields that didn't match, as Ghost's failure: Stripe sends every
 * field Ghost reads, so Ghost's expectation of the event is what's wrong. A schema's transforms
 * mustn't throw, as the failure would then escape this classification.
 */
function readPayload<Schema extends z.ZodType>(
  schema: Schema,
  received: unknown,
  type: string,
): z.output<Schema> {
  const read = schema.safeParse(received);
  if (!read.success) {
    throw new errors.InternalServerError({
      message: "Stripe sent an event Ghost can't read",
      code: FAILURE_CODES.unreadableEvent,
      context: `${type}: ${z.prettifyError(read.error)}`,
      err: read.error,
    });
  }
  return read.data;
}

/**
 * A change to a subscription, from a `customer.subscription.*` event: which subscription, its
 * customer, and how many prices it has, as Ghost supports subscriptions with one price only.
 * Ghost fetches the subscription again to save it, so nothing else is read here.
 */
const SubscriptionPayload = z
  .object({
    id: z.string(),
    customer: z.string(),
    items: z.object({ data: z.array(z.object({}).loose()) }).loose(),
  })
  .loose()
  .transform(({ id, customer, items }) => ({
    subscriptionId: id,
    customerId: customer,
    prices: items.data.length,
  }));

export type Subscription = z.output<typeof SubscriptionPayload>;

/**
 * A paid invoice: the subscription it's for, or null for a one-off payment such as a donation or a
 * gift, and what was paid. Stripe sends `invoice.payment_succeeded` only once an invoice is paid.
 */
const InvoicePayload = z
  .object({
    subscription: z.string().nullable(),
    amount_paid: z.number(),
    currency: z.string(),
  })
  .loose()
  .transform(({ subscription, amount_paid: amountPaid, currency }) => ({
    subscriptionId: subscription,
    amountPaid,
    currency,
  }));

export type Invoice = z.output<typeof InvoicePayload>;

/**
 * A refunded charge: the payment intent it was paid through, which identifies a gift, or null for
 * a charge made without one.
 */
const RefundPayload = z
  .object({ payment_intent: z.string().nullable() })
  .loose()
  .transform(({ payment_intent: paymentIntentId }) => ({ paymentIntentId }));

export type Refund = z.output<typeof RefundPayload>;

/**
 * The webhook event for a subscription event of `type`. An update to the subscription of a
 * customer on the site's ignore list is ignored. Its other events aren't, so Ghost still ends the
 * subscription when Stripe deletes it.
 */
function subscriptionEvent(type: SubscriptionEventType) {
  return (object: StripeObject, { listedCustomers }: WebhookSite): WebhookEvent => {
    const subscription = readPayload(SubscriptionPayload, object, type);
    if (type === 'customer.subscription.updated' && listedCustomers.has(subscription.customerId)) {
      return { kind: 'ignored', reason: 'listed_customer', customerId: subscription.customerId };
    }
    return { kind: 'subscription', ...subscription };
  };
}

/**
 * A Checkout session as the webhook reads it from Stripe. Every field it doesn't declare passes
 * through as Stripe sent it.
 *
 * - `metadata.name` is the name the buyer gave the site's signup form, which Ghost passes to
 *   Stripe when it creates the session, shortened to fit what Ghost stores.
 * - `metadata.ghost_site_uuid` is the uuid of the site that created the session. Several Ghost
 *   sites can share one Stripe account, and Stripe sends each event on it to every site, so a
 *   site handles only the sessions it created and those that record no site: sessions created
 *   before Ghost recorded it, and Payment Link sales. Only sessions record it, never
 *   subscriptions, because a site imported onto another install gets a new uuid and a
 *   subscription outlives that. Sites that share a uuid, such as a staging copy of production's
 *   database, can't be told apart.
 */
const CheckoutSessionObject = z
  .object({
    metadata: z
      .object({ name: StripeName.optional(), ghost_site_uuid: z.string().optional() })
      .loose()
      .nullish(),
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

/**
 * A completed card update: the setup intent that holds the member's new card. Ghost fetches the
 * setup intent for the card and the member's Stripe customer.
 */
const CardUpdateCheckoutPayload = z
  .object({ setup_intent: z.string() })
  .loose()
  .transform(({ setup_intent: setupIntentId }) => ({ setupIntentId }));

export type CardUpdateCheckout = z.output<typeof CardUpdateCheckoutPayload>;

/**
 * A paid gift purchase: the gift Ghost recorded when the buyer started the checkout, the session
 * and payment that bought it, and the buyer's Stripe customer and email when Stripe has them. The
 * gift service checks them against the gift it holds, and takes them as they're read here: every
 * id is a non-empty string, and the buyer's email is read as the gift service stores it (see
 * `StripeBuyerEmail`). A session marked only with `ghost_gift`, as Ghost 6.27 to 6.58 marked gifts
 * before recording them ahead of their checkout, has no gift id and can't be completed. It fails
 * here, reported and retried, so the site can see the payment and settle the gift by hand,
 * instead of it being ignored as if it weren't a gift. A session expires within a day, so only a
 * delayed payment, such as a bank debit, settling after a site upgrades from those versions
 * reaches this.
 */
const GiftCheckoutPayload = z
  .object({
    id: z.string().min(1),
    payment_intent: z.string().min(1),
    customer: z.string().min(1).nullable(),
    customer_details: z.object({ email: StripeBuyerEmail }).loose().nullish(),
    metadata: z.object({ ghost_gift_id: z.string().min(1) }).loose(),
  })
  .loose()
  .transform(
    ({ id, payment_intent: paymentIntentId, customer, customer_details: buyer, metadata }) => ({
      giftId: metadata.ghost_gift_id,
      sessionId: id,
      paymentIntentId,
      customerId: customer,
      buyerEmail: buyer?.email ?? null,
    }),
  );

export type GiftCheckout = z.output<typeof GiftCheckoutPayload>;

/**
 * Where a buyer came from, as Ghost writes it into the metadata of the Checkout sessions it
 * creates: the page they bought from, the referrer that brought them there, and the UTM parameters
 * of the link they followed. Ghost leaves out each one it doesn't know.
 */
const AttributionMetadata = z
  .object({
    attribution_id: z.string().optional(),
    attribution_url: z.string().optional(),
    attribution_type: z.string().optional(),
    referrer_source: z.string().optional(),
    referrer_medium: z.string().optional(),
    referrer_url: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
  })
  .loose();

/** Where a buyer came from, from a checkout's metadata, with null for each part Ghost doesn't know. */
function attributionOf(metadata: z.output<typeof AttributionMetadata>) {
  return {
    attributionId: metadata.attribution_id ?? null,
    attributionUrl: metadata.attribution_url ?? null,
    attributionType: metadata.attribution_type ?? null,
    referrerSource: metadata.referrer_source ?? null,
    referrerMedium: metadata.referrer_medium ?? null,
    referrerUrl: metadata.referrer_url ?? null,
    utmSource: metadata.utm_source ?? null,
    utmMedium: metadata.utm_medium ?? null,
    utmCampaign: metadata.utm_campaign ?? null,
    utmTerm: metadata.utm_term ?? null,
    utmContent: metadata.utm_content ?? null,
  };
}

/** `text`, or null when it's missing or only whitespace. */
function nonBlank(text: string | null | undefined): string | null {
  return text?.trim() ? text : null;
}

/** The key of the custom field Ghost adds to a donation's checkout for the donor's message. */
const DONATION_MESSAGE = 'donation_message';

/**
 * A donation: what was paid, the donor's Stripe customer when they have one, the name and email
 * they gave Stripe, the message they left, and where they came from. The name is shortened to fit
 * what Ghost stores, and an email or message the donor left empty is none. A custom field has
 * `text` only when it's a text field, as Ghost's message field is.
 */
const DonationCheckoutPayload = z
  .object({
    amount_total: z.number(),
    currency: z.string(),
    customer: z.string().nullable(),
    customer_details: z
      .object({ name: StripeName.nullish(), email: z.string().nullish() })
      .loose()
      .nullish(),
    custom_fields: z
      .array(
        z
          .object({
            key: z.string(),
            text: z.object({ value: z.string().nullish() }).loose().nullish(),
          })
          .loose(),
      )
      .optional(),
    metadata: AttributionMetadata,
  })
  .loose()
  .transform(
    ({
      amount_total: amount,
      currency,
      customer,
      customer_details: donor,
      custom_fields: fields,
      metadata,
    }) => ({
      amount,
      currency,
      customerId: customer,
      donor: { name: donor?.name ?? null, email: nonBlank(donor?.email) },
      message: fields?.find(({ key }) => key === DONATION_MESSAGE)?.text?.value || null,
      attribution: attributionOf(metadata),
    }),
  );

export type DonationCheckout = z.output<typeof DonationCheckoutPayload>;

const ignored = (reason: Exclude<IgnoreReason, 'listed_customer'>): WebhookEvent => ({
  kind: 'ignored',
  reason,
});

/**
 * The webhook event for a Checkout session event, to the site whose uuid is `siteUuid`. Every
 * event for a session another site created is ignored. A completed session in `setup` mode saves
 * a member's new card, and one in `subscription` mode is a paid signup or upgrade. A session in
 * `payment` mode is a gift or a donation, by its markers. A gift paid with a method that settles
 * later completes on `checkout.session.async_payment_succeeded`, so only a paid gift is completed.
 * A paid signup or upgrade carries the session, and every other kind carries the input its command
 * takes, read from the session.
 */
function checkoutEvent(
  type: CheckoutSessionEventType,
  received: StripeObject,
  siteUuid: string,
): WebhookEvent {
  if (type === 'checkout.session.async_payment_failed') {
    return ignored('payment_failed');
  }
  const session = readPayload(CheckoutSessionObject, received, type);
  const createdBy = session.metadata?.ghost_site_uuid;
  if (createdBy && createdBy !== siteUuid) {
    return ignored('another_site');
  }
  const { mode, paid, gift, donation, conflicting } = readPayload(CheckoutSession, session, type);
  if (type === 'checkout.session.async_payment_succeeded') {
    if (mode !== 'payment' || !gift) {
      return ignored('not_a_gift');
    }
  } else {
    if (mode === 'setup') {
      return {
        kind: 'card_update_checkout',
        ...readPayload(CardUpdateCheckoutPayload, received, type),
      };
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
    return paid
      ? { kind: 'gift_checkout', ...readPayload(GiftCheckoutPayload, received, type) }
      : ignored('gift_not_paid');
  }
  return { kind: 'donation_checkout', ...readPayload(DonationCheckoutPayload, received, type) };
}

/**
 * Builds the webhook event for each Stripe event type Ghost handles, from its `data.object`, for
 * the site that receives it.
 */
const KINDS = new Map<string, (object: StripeObject, site: WebhookSite) => WebhookEvent>([
  [
    'checkout.session.completed',
    (session, { siteUuid }) => checkoutEvent('checkout.session.completed', session, siteUuid),
  ],
  [
    'checkout.session.async_payment_succeeded',
    (session, { siteUuid }) =>
      checkoutEvent('checkout.session.async_payment_succeeded', session, siteUuid),
  ],
  [
    'checkout.session.async_payment_failed',
    (session, { siteUuid }) =>
      checkoutEvent('checkout.session.async_payment_failed', session, siteUuid),
  ],
  ['customer.subscription.created', subscriptionEvent('customer.subscription.created')],
  ['customer.subscription.updated', subscriptionEvent('customer.subscription.updated')],
  ['customer.subscription.deleted', subscriptionEvent('customer.subscription.deleted')],
  [
    'invoice.payment_succeeded',
    (invoice) => ({
      kind: 'invoice',
      ...readPayload(InvoicePayload, invoice, 'invoice.payment_succeeded'),
    }),
  ],
  [
    'charge.refunded',
    (charge) => ({ kind: 'refund', ...readPayload(RefundPayload, charge, 'charge.refunded') }),
  ],
]);

/** Reads the envelope of a Stripe event whose signature Ghost has verified. */
export function readEnvelope(verified: unknown): StripeEventEnvelope {
  return Envelope.parse(verified);
}

/**
 * Returns the webhook event for a verified Stripe event of `type`, for the site that receives it.
 * An event of a type Ghost handles that Ghost can't read fails as `unreadable_stripe_event`.
 */
export function toWebhookEvent(type: string, verified: unknown, site: WebhookSite): WebhookEvent {
  const build = KINDS.get(type);
  return build
    ? build(readPayload(WithObject, verified, type).data.object, site)
    : ignored('unhandled_type');
}
