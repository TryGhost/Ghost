import { z } from 'zod';
import {
  ActiveGiftRow,
  GrantedSubscriptionRow,
  MemberRow,
  NewsletterRow,
  StripeSubscriptionRow,
  TierRow,
} from './schema';

const { MemberCommentingCodec } = require('../commenting');

/**
 * A member's account, as this side of Ghost talks about one.
 *
 * These are domain shapes, not wire shapes: dates are dates, names are camelCase,
 * and nothing here is spelled the way the API happens to spell it. Turning one
 * into a response is `serializers.ts`, and how it is stored is `schema.ts`; a
 * model in the middle is what lets either of those change without the other
 * having to.
 *
 * The models are schemas rather than types, so parsing the rows and modelling
 * them are one step. Each shape decodes its own rows and returns its own part of
 * the account, and the account schema simply says it has some — which is what
 * makes reading a member a single parse rather than a sequence someone has to run
 * in the right order.
 *
 * What a decode needs and no row carries — what the next payment comes to, where
 * an unsubscribe link points, whether the site shows gravatars — is passed in
 * rather than reached for, so nothing here does any IO.
 */

export interface DecodeDependencies {
  /** What is next owed on a subscription, given the offer applied to it. */
  nextPayment: (subscription: unknown) => unknown;
  /** A signed link that lets a member change their mind without logging in. */
  unsubscribeUrl: (uuid: string) => string;
  /** The member's gravatar, or nothing when the site has turned that off. */
  avatarUrl: (email: string) => string | null;
}

/** The tier a subscription is for. Both kinds of subscription carry one. */
const Tier = TierRow.transform((row) => ({
  id: row.tier_id,
  name: row.tier_name,
  slug: row.tier_slug,
  active: row.tier_active,
  welcomePageUrl: row.tier_welcome_page_url,
  visibility: row.tier_visibility,
  trialDays: row.tier_trial_days,
  description: row.tier_description,
  currency: row.tier_currency,
  type: row.tier_type,
  monthlyPrice: row.tier_monthly_price,
  yearlyPrice: row.tier_yearly_price,
  monthlyPriceId: row.tier_monthly_price_id,
  yearlyPriceId: row.tier_yearly_price_id,
  createdAt: row.tier_created_at,
  updatedAt: row.tier_updated_at,
  expiryAt: row.tier_expiry_at,
}));
export type Tier = z.infer<typeof Tier>;

/**
 * What another domain answered about a subscription, carried alongside its row.
 *
 * Opaque on purpose. An offer and an attribution are other domains' read models,
 * already in the shape those domains publish, so this one neither reshapes them
 * nor claims to know what is inside them.
 */
const ExternalSubscriptionFacts = z.object({
  offer: z.unknown().nullable().default(null),
  offer_redemptions: z.array(z.unknown()).default([]),
  attribution: z.unknown().nullable().default(null),
});

/**
 * What a subscription's dates are called by the domain that works out the next payment.
 *
 * That calculator reads a subscription the way the API writes one down, not the way
 * this module models one, and it reads these four by name. Handing it the model's
 * spelling leaves all four undefined, which it reads as a subscription with no
 * discount: the amount comes back correct and the discount silently disappears, so
 * nothing throws and a member is quietly shown the wrong price.
 */
const asSubscriptionDates = (subscription: {
  startDate: Date;
  currentPeriodEnd: Date | null;
  discountStart?: Date | null;
  discountEnd?: Date | null;
}) => ({
  start_date: subscription.startDate,
  current_period_end: subscription.currentPeriodEnd,
  discount_start: subscription.discountStart ?? null,
  discount_end: subscription.discountEnd ?? null,
});

const withNextPayment = <
  T extends {
    startDate: Date;
    currentPeriodEnd: Date | null;
    discountStart?: Date | null;
    discountEnd?: Date | null;
  },
>(
  subscription: T,
  deps: DecodeDependencies,
) => ({
  ...subscription,
  // Last, because what is next owed depends on the offer already attached.
  nextPayment: deps.nextPayment({ ...subscription, ...asSubscriptionDates(subscription) }),
});

export const StripeSubscription = (deps: DecodeDependencies) =>
  StripeSubscriptionRow.and(ExternalSubscriptionFacts).transform((row) =>
    withNextPayment(
      {
        id: row.subscription_id,
        customer: {
          id: row.customer_id,
          name: row.customer_name,
          email: row.customer_email,
        },
        // A snapshot of what the member agreed to when they subscribed. Every part
        // of it is its own column, the identifier included: reaching for the joined
        // price would report today's price under the plan's name.
        plan: {
          id: row.plan_id,
          nickname: row.plan_nickname,
          interval: row.plan_interval,
          currency: row.plan_currency.toUpperCase(),
          amount: row.plan_amount,
        },
        status: row.status,
        startDate: row.start_date,
        defaultPaymentCardLast4: row.default_payment_card_last4,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        cancellationReason: row.cancellation_reason,
        currentPeriodEnd: row.current_period_end,
        trialStartAt: row.trial_start_at,
        trialEndAt: row.trial_end_at,
        discountStart: row.discount_start,
        discountEnd: row.discount_end,
        price: {
          // Long-standing and counterintuitive, and kept because the API says so:
          // `id` is Stripe's identifier for the price and `priceId` is Ghost's own
          // row, not the other way round.
          id: row.price_stripe_id,
          priceId: row.price_row_id,
          nickname: row.price_nickname,
          amount: row.price_amount,
          interval: row.price_interval,
          type: row.price_type,
          currency: row.price_currency.toUpperCase(),
          product: {
            // Stripe's product; `productId` is the Ghost tier it maps to.
            id: row.stripe_product_id,
            name: row.tier_name,
            productId: row.tier_id,
          },
        },
        tier: Tier.parse(row),
        offer: row.offer,
        offerRedemptions: row.offer_redemptions,
        attribution: row.attribution,
      },
      deps,
    ),
  );

/**
 * A subscription nobody is charged for.
 *
 * A comped or gifted member has no Stripe subscription, because nothing recurs.
 * The account carries one anyway so that granted access and paid access read the
 * same way — hence the empty identifiers and the masked card, which describe the
 * answer rather than anything stored.
 */
export const GrantedSubscription = (deps: DecodeDependencies) =>
  GrantedSubscriptionRow.and(
    z.object({ gift: ActiveGiftRow.nullable().default(null), now: z.date() }),
  ).transform((row) => {
    const isGift = row.member_status === 'gift';
    const nickname = isGift ? 'Gift subscription' : 'Complimentary';
    const interval = isGift ? (row.gift?.cadence ?? 'year') : 'year';
    const currency = isGift ? (row.gift?.currency ?? 'USD') : 'USD';
    const amount = isGift ? (row.gift?.amount ?? 0) : 0;

    return withNextPayment(
      {
        id: '',
        tier: Tier.parse(row),
        customer: { id: '', name: row.customer_name, email: row.customer_email },
        plan: { id: '', nickname, interval, currency, amount },
        status: 'active',
        // Dated from the event that granted the product. A member holding one with
        // no recorded grant reads the clock instead, so their start date moves on
        // every read — long-standing, and preserved rather than quietly corrected.
        startDate: row.granted_at ?? row.now,
        defaultPaymentCardLast4: '****',
        cancelAtPeriodEnd: false,
        cancellationReason: null,
        currentPeriodEnd: row.tier_expiry_at,
        price: {
          id: '',
          priceId: '',
          nickname,
          amount,
          interval,
          type: 'recurring',
          currency,
          product: { id: '', productId: row.tier_id },
        },
        // Stated rather than omitted: nobody is charged for this, so there is
        // nothing an offer could discount, and granted access still reads the same
        // way as paid access.
        offer: null,
        offerRedemptions: [],
      },
      deps,
    );
  });

export const Newsletter = NewsletterRow.transform((row) => ({
  id: row.id,
  uuid: row.uuid,
  name: row.name,
  description: row.description,
  sortOrder: row.sort_order,
}));
export type Newsletter = z.infer<typeof Newsletter>;

/** The whole account, as one schema over the rows that make one. */
export const MemberAccount = (deps: DecodeDependencies) =>
  MemberRow.and(
    z.object({
      newsletters: z.array(Newsletter),
      stripeSubscriptions: z.array(StripeSubscription(deps)),
      grantedSubscriptions: z.array(GrantedSubscription(deps)),
    }),
  ).transform((row) => ({
    id: row.id,
    uuid: row.uuid,
    email: row.email,
    name: row.name,
    expertise: row.expertise,
    status: row.status,
    createdAt: row.created_at,
    enableCommentNotifications: row.enable_comment_notifications,
    enableUpdatesAndAnnouncements: row.enable_updates_and_announcements,
    avatarImage: deps.avatarUrl(row.email),
    unsubscribeUrl: deps.unsubscribeUrl(row.uuid),
    // The commenting domain object, not its serialized form: whoever renders it
    // owns how it is spelled, and the codec that owns the shape can do both.
    commenting: MemberCommentingCodec.parse(row.commenting),
    emailSuppression: {
      // Either a provider rejected mail to this address or Ghost switched it off,
      // and a reader cannot act differently on the two.
      suppressed: row.suppression_reason !== null || row.email_disabled,
      info:
        row.suppression_reason === null
          ? null
          : {
              timestamp: row.suppression_at,
              reason: row.suppression_reason === 'spam' ? 'spam' : 'fail',
            },
    },
    newsletters: row.newsletters,
    subscriptions: [...row.stripeSubscriptions, ...row.grantedSubscriptions],
  }));

export type MemberAccount = ReturnType<ReturnType<typeof MemberAccount>['parse']>;
export type Subscription = MemberAccount['subscriptions'][number];
