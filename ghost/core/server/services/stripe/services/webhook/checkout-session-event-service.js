const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {
  SIGNUP_CONTEXTS,
  canWelcomeEmailReplaceSignupPaidEmail,
} = require('../../../../lib/member-signup-contexts');
const { CHECKOUT_PORT } = require('@tryghost/checkout');
const { collectedFrom } = require('../checkout/completed-session');
const { COLLECTION_FLAG } = require('../../../stripe-checkout-config/models');
/** @typedef {import('../../../../lib/member-signup-contexts').SignupContext} SignupContext */
/** @typedef {import('../../tracking').CheckoutCompletionAttempt} CheckoutCompletionAttempt */

/**
 * The wallet the buyer paid for the checkout's subscription with, as Stripe names it, such as
 * `apple_pay` or `google_pay`: `none` for a card or another method, and `unknown` when the
 * customer's subscriptions don't include it, as Stripe lists only some. Read from the payment
 * method the customer is fetched with, so it costs no request of its own.
 *
 * @param {import('stripe').Stripe.Customer} customer
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {import('../../tracking').CheckoutWallet}
 */
function walletOf(customer, session) {
  const subscription = customer.subscriptions?.data.find(
    ({ id }) => id === getStripeResourceId(session.subscription),
  );
  if (!subscription) {
    return 'unknown';
  }
  const method = subscription.default_payment_method;
  return (typeof method === 'object' && method?.card?.wallet?.type) || 'none';
}

/**
 * What became of the phone number a checkout collected, from what its bindings kept and refused,
 * a refusal naming the phone's port or a part of its value.
 *
 * @param {Set<string>} kept
 * @param {{property: string}[]} refused
 * @returns {import('../../tracking').CollectedPhoneOutcome}
 */
function phoneOutcome(kept, refused) {
  const port = CHECKOUT_PORT.phone;
  if (!kept.has(port)) {
    return 'no_destination';
  }
  const ofPhone = ({ property }) => property === port || property.startsWith(`${port}.`);
  return refused.some(ofPhone) ? 'refused' : 'saved';
}

function getStripeResourceId(resource) {
  if (typeof resource === 'string') {
    return resource;
  }

  if (resource && typeof resource === 'object' && typeof resource.id === 'string') {
    return resource.id;
  }

  return null;
}

/**
 * Completes a paid signup or upgrade from a Checkout session in `subscription` mode. Card updates,
 * gifts and donations complete in their own services in this folder.
 *
 * The `session` payload can be found here: https://docs.stripe.com/api/checkout/sessions/object
 */
module.exports = class CheckoutSessionEventService {
  /**
   * @param {object} deps
   * @param {import('../../stripe-api')} deps.api
   * @param {Pick<import('../../tracking').StripeTracking, 'checkoutCompletion' | 'collectedPhone'>} deps.tracking
   * @param {object} deps.memberRepository
   * @param {function} deps.sendSignupEmail
   * @param {function} deps.isPaidWelcomeEmailActive
   * @param {{isSet(flag: string): boolean}} deps.labs
   * @param {Pick<import('../../../members-metafields').MemberBindings, 'planThrough'>} deps.metafieldBindings
   * @param {{updateWithMetafields: (data: object, options: {id: string}, plans: import('../../../members-metafields').MetafieldPlan[]) => Promise<unknown>}} deps.memberBREADService
   */
  constructor(deps) {
    this.api = deps.api;
    this.deps = deps;
  }

  /**
   * Completes a paid signup or upgrade from a completed Checkout session in `subscription` mode:
   * makes the buyer a paid member, or links the subscription to the member who bought it, and
   * saves what the checkout collected. Records a `stripe_checkout.complete` span.
   *
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async completeSubscriptionCheckout(session) {
    return this.deps.tracking.checkoutCompletion(async (attempt) => {
      attempt.completing('subscription');
      await this.handleSubscriptionEvent(session, attempt);
    });
  }

  /**
   * Handles a `checkout.session.completed` event for a subscription
   * @param {import('stripe').Stripe.Checkout.Session} session
   * @param {CheckoutCompletionAttempt} attempt
   */
  async handleSubscriptionEvent(session, attempt) {
    const customer = await this.api.getCustomer(session.customer, {
      expand: ['subscriptions.data.default_payment_method'],
    });

    const memberRepository = this.deps.memberRepository;

    let member = await memberRepository.get({
      email: customer.email,
    });

    // A Portal signup's success link is a magic link that creates the member when the buyer
    // lands back on the site, which can happen before this event arrives. That member was
    // still created by this checkout, so only one created before it started counts.
    const memberPreexisted =
      Boolean(member) && !(session.created && member.get('created_at') >= session.created * 1000);
    const checkoutType = session.metadata?.checkoutType;
    // Typing an email address into a checkout doesn't prove owning it, so a checkout an existing
    // member didn't start signed in links their subscription and saves what it collected into
    // custom fields, but can't change their name.
    const buyerVerified =
      !memberPreexisted ||
      session.metadata?.ghostSignupContext === SIGNUP_CONTEXTS.ALREADY_AUTHENTICATED;
    attempt.buying({ existing: memberPreexisted, verified: buyerVerified });

    if (!member) {
      const metadataName = session.metadata?.name;
      const metadataNewsletters = session.metadata?.newsletters;
      const attribution = {
        id: session.metadata?.attribution_id ?? null,
        url: session.metadata?.attribution_url ?? null,
        type: session.metadata?.attribution_type ?? null,
        referrerSource: session.metadata?.referrer_source ?? null,
        referrerMedium: session.metadata?.referrer_medium ?? null,
        referrerUrl: session.metadata?.referrer_url ?? null,
      };

      const payerName =
        customer.subscriptions?.data?.[0]?.default_payment_method?.billing_details?.name;
      const name = metadataName || payerName || null;

      const memberData = { email: customer.email, name, attribution };
      if (metadataNewsletters) {
        try {
          memberData.newsletters = JSON.parse(metadataNewsletters);
        } catch (err) {
          logging.error({
            event: { name: 'stripe_checkout.session.newsletters_unreadable' },
            err,
            newsletters: metadataNewsletters,
            session_id: session.id,
          });
        }
      }

      const offerId = session.metadata?.offer;
      const memberDataWithStripeCustomer = {
        ...memberData,
        stripeCustomer: customer,
        offerId,
      };
      member = await memberRepository.create(memberDataWithStripeCustomer);
    } else {
      const payerName =
        customer.subscriptions?.data?.[0]?.default_payment_method?.billing_details?.name;
      const attribution = {
        id: session.metadata?.attribution_id ?? null,
        url: session.metadata?.attribution_url ?? null,
        type: session.metadata?.attribution_type ?? null,
        referrerSource: session.metadata?.referrer_source ?? null,
        referrerMedium: session.metadata?.referrer_medium ?? null,
        referrerUrl: session.metadata?.referrer_url ?? null,
      };

      if (buyerVerified && payerName && !member.get('name')) {
        await memberRepository.update({ name: payerName }, { id: member.get('id') });
      }

      await memberRepository.upsertCustomer({
        customer_id: customer.id,
        member_id: member.id,
        name: customer.name,
        email: customer.email,
      });

      for (const subscription of customer.subscriptions.data) {
        try {
          const offerId = session.metadata?.offer;

          await memberRepository.linkSubscription({
            id: member.id,
            subscription,
            offerId,
            attribution,
          });
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
            throw err;
          }
          throw new errors.ConflictError({
            err,
          });
        }
      }

      // If member is now paid, remove any complimentary access
      const updatedMember = await memberRepository.get({ id: member.id });
      if (updatedMember && updatedMember.get('status') === 'paid') {
        await memberRepository.removeComplimentarySubscription({ id: member.id });
      }
    }

    // After the subscription work and apart from it: a throw here would fail the webhook, and
    // Stripe's retry could repeat the payment work.
    await this.saveCollected(member.id, session, {
      wallet: walletOf(customer, session),
      attempt,
    });

    const ghostSignupContext = /** @type {SignupContext | undefined} */ (
      session.metadata?.ghostSignupContext
    );
    // The client sets checkoutType; Ghost sets the signup context when it creates the session.
    // When Ghost marked the buyer as having no guaranteed sign-in path, the signup email goes out
    // even on an upgrade.
    const buyerNeedsMagicLinkEmail = ghostSignupContext === SIGNUP_CONTEXTS.NEEDS_MAGIC_LINK_EMAIL;

    if (checkoutType !== 'upgrade' || buyerNeedsMagicLinkEmail) {
      const shouldSkipSignupEmailWhenWelcomeEmailActive =
        canWelcomeEmailReplaceSignupPaidEmail(ghostSignupContext);

      if (shouldSkipSignupEmailWhenWelcomeEmailActive) {
        const isPaidWelcomeEmailActive = await this.deps.isPaidWelcomeEmailActive();
        if (!isPaidWelcomeEmailActive) {
          this.deps.sendSignupEmail(customer.email);
        }
      } else {
        // Direct checkout flows do not have a pre-checkout sign-in path.
        this.deps.sendSignupEmail(customer.email);
      }
    }
  }

  /**
   * Saves what a checkout asked the buyer for into the custom fields the site's config names.
   * They're saved for every buyer, including an existing member who checked out without signing
   * in: what the checkout collected only ever goes into custom fields, and never changes the
   * member's name or email.
   *
   * Never throws: a failed webhook makes Stripe retry it, which could repeat the payment work.
   *
   * @param {string} memberId
   * @param {import('stripe').Stripe.Checkout.Session} session
   * @param {object} options
   * @param {import('../../tracking').CheckoutWallet} options.wallet The wallet the buyer paid with
   * @param {CheckoutCompletionAttempt} options.attempt
   */
  async saveCollected(memberId, session, { wallet, attempt }) {
    try {
      if (!this.deps.labs.isSet(COLLECTION_FLAG)) {
        return;
      }
      const { answers: collected, phone } = collectedFrom.parse(session);
      if (collected.length === 0) {
        return;
      }
      attempt.collecting(collected);
      // Each value recorded against the binding that routed it, and what a field refuses is
      // logged rather than thrown, as the money is already taken: the rest are still saved.
      const { plans, refused, kept } = await this.deps.metafieldBindings.planThrough(collected, {
        type: 'binding',
      });
      attempt.saving({ kept, refused });
      if (plans.length > 0) {
        // Through the members service, like any other edit, so the change reaches webhooks.
        await this.deps.memberBREADService.updateWithMetafields({}, { id: memberId }, plans);
      }
      if (kept.size === 0) {
        // The checkout asked, but collection was switched off or its fields deleted since.
        logging.warn(
          {
            event: { name: 'stripe_checkout.collection.no_destination' },
            member_id: memberId,
            session_id: session.id,
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
            session_id: session.id,
          },
          'Saved what a checkout collected, apart from what its custom fields refused',
        );
      }
      // Counted so how often a wallet's number needs a country to be read, and what then becomes
      // of it, can be watched.
      if (phone) {
        this.deps.tracking.collectedPhone({ wallet, phone, outcome: phoneOutcome(kept, refused) });
      }
    } catch (err) {
      attempt.failing();
      logging.error(
        {
          event: { name: 'stripe_checkout.collection.save_failed' },
          err,
          member_id: memberId,
          session_id: session.id,
        },
        'Failed to save what a checkout collected',
      );
    }
  }
};
