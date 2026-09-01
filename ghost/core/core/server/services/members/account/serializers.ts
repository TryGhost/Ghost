import type { MemberAccount, Newsletter, Subscription, Tier } from './models';

const { MemberCommentingCodec } = require('../commenting');

/**
 * An account as the members API spells it.
 *
 * The models say what a member's account is; this says how the API has always
 * written one down. They are separate because the second has to stay still: a key
 * added to a response cannot be withdrawn without breaking whoever started reading
 * it, so the wire shape is a promise while the model is free to be reworked.
 *
 * Written by hand rather than run through a key converter. Half of what an account
 * carries belongs to other domains — an offer, an attribution, what the next
 * payment comes to — and those arrive already in the shape their own domain
 * publishes, some of it camelCase. A converter would rewrite them into something
 * no client has ever been sent.
 */

type Wire = any;

const iso = (value: Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toISOString();

const serializeTier = (tier: Tier): Wire => ({
  id: tier.id,
  name: tier.name,
  slug: tier.slug,
  active: tier.active,
  welcome_page_url: tier.welcomePageUrl,
  visibility: tier.visibility,
  trial_days: tier.trialDays,
  description: tier.description,
  type: tier.type,
  currency: tier.currency,
  monthly_price: tier.monthlyPrice,
  yearly_price: tier.yearlyPrice,
  monthly_price_id: tier.monthlyPriceId,
  yearly_price_id: tier.yearlyPriceId,
  created_at: iso(tier.createdAt),
  updated_at: iso(tier.updatedAt),
  expiry_at: iso(tier.expiryAt),
});

const serializeSubscription = (subscription: Subscription): Wire => {
  const wire: Wire = {
    id: subscription.id,
    customer: subscription.customer,
    plan: subscription.plan,
    status: subscription.status,
    start_date: iso(subscription.startDate),
    default_payment_card_last4: subscription.defaultPaymentCardLast4,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    cancellation_reason: subscription.cancellationReason,
    current_period_end: iso(subscription.currentPeriodEnd),
    price: {
      id: subscription.price.id,
      price_id: subscription.price.priceId,
      nickname: subscription.price.nickname,
      amount: subscription.price.amount,
      interval: subscription.price.interval,
      type: subscription.price.type,
      currency: subscription.price.currency,
      product: {
        id: subscription.price.product.id,
        // Only Stripe's product is named. A granted subscription's is fabricated
        // and never had one, and adding it now would widen the response.
        ...('name' in subscription.price.product ? { name: subscription.price.product.name } : {}),
        product_id: subscription.price.product.productId,
      },
    },
    tier: serializeTier(subscription.tier),
    offer: subscription.offer,
    offer_redemptions: subscription.offerRedemptions,
    // Another domain's shape, passed through untouched.
    next_payment: subscription.nextPayment,
  };

  // Only a Stripe-backed subscription has these; a granted one never had them, and
  // adding them now would widen the response.
  if ('trialStartAt' in subscription) {
    wire.trial_start_at = iso(subscription.trialStartAt);
    wire.trial_end_at = iso(subscription.trialEndAt);
    wire.discount_start = iso(subscription.discountStart);
    wire.discount_end = iso(subscription.discountEnd);
  }
  if ('attribution' in subscription) {
    wire.attribution = subscription.attribution;
  }

  return wire;
};

/** Not the helper of the same name in `../utils`: that one formats Bookshelf rows
 * for the newsletter preference endpoints, this one formats the account's model. */
function serializeNewsletters(newsletters: Newsletter[]): Wire[] {
  return newsletters.map((newsletter) => ({
    id: newsletter.id,
    uuid: newsletter.uuid,
    name: newsletter.name,
    description: newsletter.description,
    sort_order: newsletter.sortOrder,
  }));
}

/**
 * `firstname` and `paid` are derived here rather than modelled.
 *
 * Neither is stored and neither is a fact about a member: they are conveniences
 * for whoever renders one, and they exist in this response and no other.
 */
export function toAccountResponse(account: MemberAccount | null): Wire | null {
  if (!account) {
    return null;
  }

  return {
    uuid: account.uuid,
    email: account.email,
    name: account.name,
    firstname: account.name && account.name.split(' ')[0],
    expertise: account.expertise,
    avatar_image: account.avatarImage,
    unsubscribe_url: account.unsubscribeUrl,
    // Always false, and has been for as long as this response has existed: there
    // is no `subscribed` column on a member, and the Admin API derives its own
    // meaning for the word rather than reading one from here. Written down rather
    // than left as a coincidence of a missing property.
    subscribed: false,
    subscriptions: account.subscriptions.map(serializeSubscription),
    status: account.status,
    paid: account.status !== 'free',
    created_at: iso(account.createdAt),
    enable_comment_notifications: account.enableCommentNotifications,
    enable_updates_and_announcements: account.enableUpdatesAndAnnouncements,
    can_comment: account.commenting.canComment,
    commenting: MemberCommentingCodec.toJSON(account.commenting),
    newsletters: serializeNewsletters(account.newsletters),
    email_suppression: {
      suppressed: account.emailSuppression.suppressed,
      info: account.emailSuppression.info,
    },
  };
}
