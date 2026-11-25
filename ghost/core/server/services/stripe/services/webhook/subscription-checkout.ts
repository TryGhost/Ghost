import { CHECKOUT_PORT } from '@tryghost/checkout';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {
  canWelcomeEmailReplaceSignupPaidEmail,
  SIGNUP_CONTEXTS,
} from '../../../../lib/member-signup-contexts';
import type { MemberBindings, MetafieldPlan } from '../../../members-metafields';
import { COLLECTION_FLAG } from '../../../stripe-checkout-config/models';
import type { StripeCustomer } from '../../stripe-api-responses';
import type {
  CheckoutCompletionAttempt,
  CheckoutWallet,
  CollectedPhoneOutcome,
  StripeTracking,
  WebhookOutcome,
} from '../../tracking';
import { collectedOf } from '../../webhook/completed-session';
import { FAILURE_CODES } from '../../webhook/failures';
import type { SubscriptionCheckout } from '../../webhook/webhook-event';
import {
  linkOrConflict,
  type MemberAttribution,
  type SubscriptionLinks,
} from './link-subscription';

/** A Stripe customer that Stripe still has: a deleted customer has only its id. */
type Customer = Exclude<StripeCustomer, { deleted: true }>;

/** The attributes of a member that a paid signup or upgrade reads. */
interface MemberAttributes {
  name: string | null;
  created_at: Date;
  status: string;
}

interface Member {
  id: string;
  get<Attribute extends keyof MemberAttributes>(attribute: Attribute): MemberAttributes[Attribute];
}

/** The parts of the member repository a paid signup or upgrade uses. */
interface MemberRepository extends SubscriptionLinks {
  get(filter: { email: string } | { id: string }): Promise<Member | null>;
  /**
   * Creates the member with their Stripe customer, and links each of the customer's
   * subscriptions. Without `newsletters`, the member gets the site's default newsletters.
   */
  create(member: {
    email: string;
    name: string | null;
    attribution: MemberAttribution;
    newsletters?: { id: string }[];
    stripeCustomer: Customer;
    offerId: string | undefined;
  }): Promise<{ id: string }>;
  update(data: { name: string }, options: { id: string }): Promise<unknown>;
  upsertCustomer(customer: {
    customer_id: string;
    member_id: string;
    name: string | null | undefined;
    email: string;
  }): Promise<unknown>;
  removeComplimentarySubscription(data: { id: string }): Promise<unknown>;
}

export interface SubscriptionCheckoutDeps {
  api: {
    getCustomer(id: string, options: { expand: string[] }): Promise<StripeCustomer>;
  };
  memberRepository: MemberRepository;
  /** Sends a new paid member the email that signs them in. */
  sendSignupEmail(email: string): Promise<unknown>;
  /** Whether the site's welcome email for new paid members is on. */
  isPaidWelcomeEmailActive(): Promise<boolean>;
  labs: { isSet(flag: string): boolean };
  metafieldBindings: Pick<MemberBindings, 'planThrough'>;
  memberBREADService: {
    updateWithMetafields(
      data: object,
      options: { id: string },
      plans: MetafieldPlan[],
    ): Promise<unknown>;
  };
  tracking: Pick<StripeTracking, 'checkoutCompletion' | 'collectedPhone'>;
}

/**
 * Whether a paid signup or upgrade sends the buyer the signup email, which signs them in:
 *
 * - `send`: Ghost marked the buyer as having no sure way to sign in, as a direct checkout without
 *   Portal's signup gives none, or the checkout has no signup context, as one opened by an older
 *   Ghost version.
 * - `unless_welcome_email`: only while the site's paid welcome email is off. The buyer can already
 *   sign in, signed in before the checkout or with the magic link Portal sent before it, and the
 *   welcome email greets them instead.
 * - `none`: an upgrade, whose buyer is a member who can already sign in.
 */
type SignupEmail = 'send' | 'unless_welcome_email' | 'none';

/**
 * Whether a paid signup or upgrade sends the signup email (see `SignupEmail`). Portal marks an
 * upgrade and Ghost sets the signup context, so a buyer Ghost marked as having no sure way to sign
 * in gets the email even on an upgrade.
 */
function signupEmailFor({
  upgrade,
  signupContext,
}: Pick<SubscriptionCheckout, 'upgrade' | 'signupContext'>): SignupEmail {
  if (upgrade && signupContext !== SIGNUP_CONTEXTS.NEEDS_MAGIC_LINK_EMAIL) {
    return 'none';
  }
  return canWelcomeEmailReplaceSignupPaidEmail(signupContext) ? 'unless_welcome_email' : 'send';
}

/**
 * The name on the card that pays the customer's first subscription, which Ghost fetches with the
 * customer, when Stripe has one.
 */
function cardholderOf(customer: Customer): string | null | undefined {
  const method = customer.subscriptions.data[0]?.default_payment_method;
  return typeof method === 'object' ? method?.billing_details.name : undefined;
}

/**
 * The wallet the buyer paid for the checkout's subscription with, as Stripe names it, such as
 * `apple_pay` or `google_pay`: `none` for a card or another method, and `unknown` when the
 * customer's subscriptions don't include it, as Stripe lists only some. Read from the payment
 * method the customer is fetched with, so it costs no request of its own.
 */
function walletOf(customer: Customer, subscriptionId: string | null): CheckoutWallet {
  const subscription = customer.subscriptions.data.find(({ id }) => id === subscriptionId);
  if (!subscription) {
    return 'unknown';
  }
  const method = subscription.default_payment_method;
  return (typeof method === 'object' && method?.card?.wallet?.type) || 'none';
}

/**
 * What became of the phone number a checkout collected, from what its bindings kept and refused,
 * a refusal naming the phone's port or a part of its value.
 */
function phoneOutcome(
  kept: ReadonlySet<string>,
  refused: readonly { property: string }[],
): CollectedPhoneOutcome {
  const port = CHECKOUT_PORT.phone;
  if (!kept.has(port)) {
    return 'no_destination';
  }
  const ofPhone = ({ property }: { property: string }) =>
    property === port || property.startsWith(`${port}.`);
  return refused.some(ofPhone) ? 'refused' : 'saved';
}

/**
 * Where the buyer came from, as the member repository saves it: the page they bought from and the
 * referrer that brought them there. The repository records the UTM parameters of a paid member's
 * subscription from the Stripe subscription, where Ghost writes them too, but not on the member's
 * signup, as Ghost doesn't pass them here.
 */
function memberAttributionOf({ attribution }: SubscriptionCheckout): MemberAttribution {
  return {
    id: attribution.attributionId,
    url: attribution.attributionUrl,
    type: attribution.attributionType,
    referrerSource: attribution.referrerSource,
    referrerMedium: attribution.referrerMedium,
    referrerUrl: attribution.referrerUrl,
  };
}

/**
 * Completes a paid signup or upgrade from a Checkout session in `subscription` mode: makes the
 * buyer a paid member, or links the subscription to the member who bought it, saves what the
 * checkout collected, and sends the signup email. Records a `stripe_checkout.complete` span.
 */
export async function completeSubscriptionCheckout(
  deps: SubscriptionCheckoutDeps,
  checkout: SubscriptionCheckout,
): Promise<WebhookOutcome> {
  return deps.tracking.checkoutCompletion(async (attempt) => {
    attempt.completing('subscription');
    await complete(deps, checkout, attempt);
    return { result: 'handled' };
  });
}

async function complete(
  deps: SubscriptionCheckoutDeps,
  checkout: SubscriptionCheckout,
  attempt: CheckoutCompletionAttempt,
) {
  const { api, memberRepository } = deps;
  const customer = await api.getCustomer(checkout.customerId, {
    expand: ['subscriptions.data.default_payment_method'],
  });
  // A member is saved under an email address. Stripe Checkout collects one for every
  // subscription, so this refuses only a customer deleted, or left without one, since.
  if (customer.deleted || !customer.email) {
    throw new errors.ValidationError({
      code: FAILURE_CODES.unusableCustomer,
      message: "The checkout's Stripe customer has no email address for the member.",
    });
  }
  const email = customer.email;
  const member = await memberRepository.get({ email });

  // A Portal signup's success link is a magic link that creates the member when the buyer
  // lands back on the site, which can happen before this event arrives. That member was
  // still created by this checkout, so only one created before it started counts.
  const memberPreexisted =
    member !== null && member.get('created_at').getTime() < checkout.createdAt * 1000;
  // Typing an email address into a checkout doesn't prove owning it, so a checkout an existing
  // member didn't start signed in links their subscription and saves what it collected into
  // custom fields, but can't change their name.
  const buyerVerified =
    !memberPreexisted || checkout.signupContext === SIGNUP_CONTEXTS.ALREADY_AUTHENTICATED;
  attempt.buying({ existing: memberPreexisted, verified: buyerVerified });

  const memberId = member
    ? await linkSubscriptions(deps, member, customer, email, checkout, buyerVerified)
    : await createPaidMember(deps, customer, email, checkout);

  // After the subscription work and apart from it: a throw here would fail the webhook, and
  // Stripe's retry could repeat the payment work.
  await saveCollected(deps, memberId, checkout, {
    wallet: walletOf(customer, checkout.subscriptionId),
    attempt,
  });

  const signupEmail = signupEmailFor(checkout);
  if (
    signupEmail === 'send' ||
    (signupEmail === 'unless_welcome_email' && !(await deps.isPaidWelcomeEmailActive()))
  ) {
    // Not awaited: the checkout is complete whether or not the email goes out.
    void deps.sendSignupEmail(email);
  }
}

/**
 * Makes the buyer a paid member with their Stripe customer, under the name they gave the site's
 * signup form, or else the cardholder's.
 */
async function createPaidMember(
  deps: Pick<SubscriptionCheckoutDeps, 'memberRepository'>,
  customer: Customer,
  email: string,
  checkout: SubscriptionCheckout,
) {
  const newsletters = chosenNewsletters(checkout);
  const member = await deps.memberRepository.create({
    email,
    name: checkout.name || cardholderOf(customer) || null,
    attribution: memberAttributionOf(checkout),
    ...(newsletters ? { newsletters } : {}),
    stripeCustomer: customer,
    offerId: checkout.offerId,
  });
  return member.id;
}

/**
 * The newsletters a new member chose, or undefined for the site's default newsletters, which a
 * member gets too when Ghost can't read the newsletters their checkout names.
 */
function chosenNewsletters({ newsletters, sessionId }: SubscriptionCheckout) {
  switch (newsletters.state) {
    case 'chosen':
      return newsletters.newsletters;
    case 'unreadable':
      logging.error(
        {
          event: { name: 'stripe_checkout.session.newsletters_unreadable' },
          newsletters: newsletters.given,
          session_id: sessionId,
        },
        "Gave a new member the site's default newsletters, as Ghost couldn't read those their checkout named",
      );
      return undefined;
    case 'absent':
      return undefined;
  }
}

/**
 * Links the customer's subscriptions to the member who bought them, and removes the member's
 * complimentary subscription once they're paid. A member without a name gets the cardholder's,
 * when the buyer proved they're the member.
 */
async function linkSubscriptions(
  deps: Pick<SubscriptionCheckoutDeps, 'memberRepository'>,
  member: Member,
  customer: Customer,
  email: string,
  checkout: SubscriptionCheckout,
  buyerVerified: boolean,
) {
  const { memberRepository } = deps;
  const cardholder = cardholderOf(customer);
  if (buyerVerified && cardholder && !member.get('name')) {
    await memberRepository.update({ name: cardholder }, { id: member.id });
  }

  await memberRepository.upsertCustomer({
    customer_id: customer.id,
    member_id: member.id,
    name: customer.name,
    email,
  });

  const attribution = memberAttributionOf(checkout);
  for (const subscription of customer.subscriptions.data) {
    await linkOrConflict(memberRepository, {
      id: member.id,
      subscription,
      offerId: checkout.offerId,
      attribution,
    });
  }

  const updatedMember = await memberRepository.get({ id: member.id });
  if (updatedMember?.get('status') === 'paid') {
    await memberRepository.removeComplimentarySubscription({ id: member.id });
  }
  return member.id;
}

/**
 * Saves what a checkout asked the buyer for into the custom fields the site's config names.
 * They're saved for every buyer, including an existing member who checked out without signing
 * in: what the checkout collected only ever goes into custom fields, and never changes the
 * member's name or email.
 *
 * Never throws: a failed webhook makes Stripe retry it, which could repeat the payment work.
 */
async function saveCollected(
  deps: Pick<
    SubscriptionCheckoutDeps,
    'labs' | 'metafieldBindings' | 'memberBREADService' | 'tracking'
  >,
  memberId: string,
  { collected, sessionId }: SubscriptionCheckout,
  { wallet, attempt }: { wallet: CheckoutWallet; attempt: CheckoutCompletionAttempt },
) {
  try {
    if (!deps.labs.isSet(COLLECTION_FLAG)) {
      return;
    }
    const { answers, phone } = collectedOf(collected);
    if (answers.length === 0) {
      return;
    }
    attempt.collecting(answers);
    // Each value recorded against the binding that routed it, and what a field refuses is
    // logged rather than thrown, as the money is already taken: the rest are still saved.
    const { plans, refused, kept } = await deps.metafieldBindings.planThrough(answers, {
      type: 'binding',
    });
    attempt.saving({ kept, refused });
    if (plans.length > 0) {
      // Through the members service, like any other edit, so the change reaches webhooks.
      await deps.memberBREADService.updateWithMetafields({}, { id: memberId }, plans);
    }
    if (kept.size === 0) {
      // The checkout asked, but collection was switched off or its fields deleted since.
      logging.warn(
        {
          event: { name: 'stripe_checkout.collection.no_destination' },
          member_id: memberId,
          session_id: sessionId,
        },
        'Dropped what a checkout collected, as no custom field takes it now',
      );
    }
    if (refused.length > 0) {
      // Named by port and part, never with what was given, which is the member's.
      logging.error(
        {
          event: { name: 'stripe_checkout.collection.refused' },
          refused: refused.map(({ property }) => property),
          member_id: memberId,
          session_id: sessionId,
        },
        'Saved what a checkout collected, apart from what its custom fields refused',
      );
    }
    // Counted so how often a wallet's number needs a country to be read, and what then becomes
    // of it, can be watched.
    if (phone) {
      deps.tracking.collectedPhone({ wallet, phone, outcome: phoneOutcome(kept, refused) });
    }
  } catch (err) {
    attempt.failing();
    logging.error(
      {
        event: { name: 'stripe_checkout.collection.save_failed' },
        err,
        member_id: memberId,
        session_id: sessionId,
      },
      'Failed to save what a checkout collected',
    );
  }
}
