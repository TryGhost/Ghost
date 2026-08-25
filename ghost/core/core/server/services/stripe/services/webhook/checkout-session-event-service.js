const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const { canWelcomeEmailReplaceSignupPaidEmail } = require('../../../lib/member-signup-contexts');
/** @typedef {import('../../../lib/member-signup-contexts').SignupContext} SignupContext */

function isStripeMetadataTrue(value) {
  return value === true || value === 'true';
}

function hasStripeMetadataKey(metadata, key) {
  return Object.prototype.hasOwnProperty.call(metadata || {}, key);
}

function isGiftCheckoutSession(session) {
  return (
    hasStripeMetadataKey(session.metadata, 'ghost_gift_id') ||
    isStripeMetadataTrue(session.metadata?.ghost_gift)
  );
}

function isDonationCheckoutSession(session) {
  return isStripeMetadataTrue(session.metadata?.ghost_donation);
}

// Matches the donation marker on key presence, not truthiness, so an ill-formed
// donation marker alongside a true gift marker still counts as a conflict.
function hasConflictingCheckoutFlowMetadata(session) {
  return hasStripeMetadataKey(session.metadata, 'ghost_donation') && isGiftCheckoutSession(session);
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

function getGiftBuyerEmailFromSession(session) {
  if (session.customer_details?.email) {
    return session.customer_details.email;
  }

  if (
    session.customer &&
    typeof session.customer === 'object' &&
    !session.customer.deleted &&
    session.customer.email
  ) {
    return session.customer.email;
  }

  return null;
}

/**
 * Handles `checkout.session.completed` webhook events
 *
 * The `checkout.session.completed` event is triggered when a customer completes a checkout session.
 *
 * It is triggered for the following scenarios:
 * - Subscription
 * - Donation
 * - Gift purchase
 * - Setup intent
 *
 * This service delegates the event to the appropriate handler based on the session mode and metadata.
 *
 * The `session` payload can be found here: https://docs.stripe.com/api/checkout/sessions/object
 */
module.exports = class CheckoutSessionEventService {
  /**
   * @param {object} deps
   * @param {import('../../stripe-api')} deps.api
   * @param {object} deps.memberRepository
   * @param {object} deps.donationRepository
   * @param {object} deps.giftService
   * @param {object} deps.staffServiceEmails
   * @param {function} deps.sendSignupEmail
   * @param {function} deps.isPaidWelcomeEmailActive
   */
  constructor(deps) {
    this.api = deps.api;
    this.deps = deps;
  }

  /**
   * Handles a `checkout.session.completed` event
   * Delegates to the appropriate handler based on the session mode and metadata
   * @param {import('stripe').Stripe.Checkout.Session} session
   * @param {import('stripe').Stripe.Event.Type} [eventType]
   */
  async handleEvent(session, eventType = 'checkout.session.completed') {
    if (eventType === 'checkout.session.async_payment_failed') {
      return;
    }

    if (eventType === 'checkout.session.async_payment_succeeded') {
      if (session.mode === 'payment' && isGiftCheckoutSession(session)) {
        await this.handlePaymentEvent(session);
      }
      return;
    }

    if (session.mode === 'setup') {
      await this.handleSetupEvent(session);
    }

    if (session.mode === 'subscription') {
      await this.handleSubscriptionEvent(session);
    }

    if (session.mode === 'payment') {
      await this.handlePaymentEvent(session);
    }
  }

  /**
   * Routes a `payment` mode session to the donation or gift handler. Gift purchases
   * may complete asynchronously, so their handler only runs once Stripe reports the
   * session as paid, whichever event carried it.
   *
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async handlePaymentEvent(session) {
    if (hasConflictingCheckoutFlowMetadata(session)) {
      logging.warn('Ignoring checkout session with conflicting payment flow metadata');
      return;
    }

    if (isGiftCheckoutSession(session)) {
      if (session.payment_status !== 'paid') {
        return;
      }
      await this.handleGiftEvent(session);
      return;
    }

    if (isDonationCheckoutSession(session)) {
      await this.handleDonationEvent(session);
    }
  }

  /**
   * Handles a `checkout.session.completed` event for a gift subscription purchase
   *
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async handleGiftEvent(session) {
    const stripeCustomerId = getStripeResourceId(session.customer);

    if (session.metadata?.ghost_gift_id) {
      await this.deps.giftService.completePurchase({
        giftId: session.metadata.ghost_gift_id,
        buyerEmail: getGiftBuyerEmailFromSession(session),
        stripeCustomerId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: getStripeResourceId(session.payment_intent),
      });
      return;
    }

    const buyerEmail = await this.getGiftBuyerEmail(session, stripeCustomerId);
    await this.deps.giftService.completePurchase({
      token: session.metadata?.gift_token,
      buyerEmail,
      stripeCustomerId,
      tierId: session.metadata?.tier_id,
      cadence: session.metadata?.cadence,
      duration: Number(session.metadata?.duration),
      currency: session.currency,
      amount: session.amount_total,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: getStripeResourceId(session.payment_intent),
    });
  }

  /**
   * Legacy gift Checkout sessions predate persisted buyer details. If their
   * webhook snapshot has no customer details, recover the required buyer email
   * from the Customer associated with the session.
   *
   * @param {import('stripe').Stripe.Checkout.Session} session
   * @param {string|null} stripeCustomerId
   * @returns {Promise<string|null>}
   */
  async getGiftBuyerEmail(session, stripeCustomerId) {
    const sessionEmail = getGiftBuyerEmailFromSession(session);
    if (sessionEmail) {
      return sessionEmail;
    }

    if (!stripeCustomerId) {
      return null;
    }

    const customer = await this.api.getCustomer(stripeCustomerId);
    return customer.deleted ? null : (customer.email ?? null);
  }

  /**
   * Handles a `checkout.session.completed` event for a donation
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async handleDonationEvent(session) {
    const donationField = session.custom_fields?.find((obj) => obj?.key === 'donation_message');
    const donationMessage = donationField?.text?.value ? donationField.text.value : null;
    const amount = session.amount_total;
    const currency = session.currency;

    const memberRepository = this.deps.memberRepository;
    const member = session.customer
      ? await memberRepository.get({ customer_id: session.customer })
      : null;

    const { DonationPaymentEvent } = require('../../../donations/donation-payment-event');
    const data = DonationPaymentEvent.create({
      name: member?.get('name') ?? session.customer_details.name,
      email: member?.get('email') ?? session.customer_details.email,
      memberId: member?.id ?? null,
      amount,
      currency,
      donationMessage,
      attributionId: session.metadata?.attribution_id ?? null,
      attributionUrl: session.metadata?.attribution_url ?? null,
      attributionType: session.metadata?.attribution_type ?? null,
      referrerSource: session.metadata?.referrer_source ?? null,
      referrerMedium: session.metadata?.referrer_medium ?? null,
      referrerUrl: session.metadata?.referrer_url ?? null,
      utmSource: session.metadata?.utm_source ?? null,
      utmMedium: session.metadata?.utm_medium ?? null,
      utmCampaign: session.metadata?.utm_campaign ?? null,
      utmTerm: session.metadata?.utm_term ?? null,
      utmContent: session.metadata?.utm_content ?? null,
    });

    const donationRepository = this.deps.donationRepository;
    await donationRepository.save(data);

    const staffServiceEmails = this.deps.staffServiceEmails;
    await staffServiceEmails.notifyDonationReceived({ donationPaymentEvent: data });
  }

  /**
   * Handles a `checkout.session.completed` event for a setup intent
   *
   * This is used when a customer adds or changes their payment method outside
   * of the normal subscription flow.
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async handleSetupEvent(session) {
    const setupIntent = await this.api.getSetupIntent(session.setup_intent);

    const memberRepository = this.deps.memberRepository;
    const member = await memberRepository.get({
      customer_id: setupIntent.metadata.customer_id,
    });

    if (!member) {
      return;
    }

    await this.api.attachPaymentMethodToCustomer(
      setupIntent.metadata.customer_id,
      setupIntent.payment_method,
    );

    if (setupIntent.metadata.subscription_id) {
      const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
        setupIntent.metadata.subscription_id,
        setupIntent.payment_method,
      );
      try {
        await memberRepository.linkSubscription({
          id: member.id,
          subscription: updatedSubscription,
        });
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
          throw err;
        }
        throw new errors.ConflictError({
          err,
        });
      }
      return;
    }

    const subscriptions = await member.related('stripeSubscriptions').fetch();
    const activeSubscriptions = subscriptions.models.filter((subscription) =>
      ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.get('status')),
    );

    for (const subscription of activeSubscriptions) {
      if (subscription.get('customer_id') === setupIntent.metadata.customer_id) {
        const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
          subscription.get('subscription_id'),
          setupIntent.payment_method,
        );
        try {
          await memberRepository.linkSubscription({
            id: member.id,
            subscription: updatedSubscription,
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
    }
  }

  /**
   * Handles a `checkout.session.completed` event for a subscription
   * @param {import('stripe').Stripe.Checkout.Session} session
   */
  async handleSubscriptionEvent(session) {
    const customer = await this.api.getCustomer(session.customer, {
      expand: ['subscriptions.data.default_payment_method'],
    });

    const memberRepository = this.deps.memberRepository;

    let member = await memberRepository.get({
      email: customer.email,
    });

    const checkoutType = _.get(session, 'metadata.checkoutType');

    if (!member) {
      const metadataName = _.get(session, 'metadata.name');
      const metadataNewsletters = _.get(session, 'metadata.newsletters');
      const attribution = {
        id: session.metadata?.attribution_id ?? null,
        url: session.metadata?.attribution_url ?? null,
        type: session.metadata?.attribution_type ?? null,
        referrerSource: session.metadata?.referrer_source ?? null,
        referrerMedium: session.metadata?.referrer_medium ?? null,
        referrerUrl: session.metadata?.referrer_url ?? null,
      };

      const payerName = _.get(
        customer,
        'subscriptions.data[0].default_payment_method.billing_details.name',
      );
      const name = metadataName || payerName || null;

      const memberData = { email: customer.email, name, attribution };
      if (metadataNewsletters) {
        try {
          memberData.newsletters = JSON.parse(metadataNewsletters);
        } catch (e) {
          logging.error(`Ignoring invalid newsletters data - ${metadataNewsletters}.`);
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
      const payerName = _.get(
        customer,
        'subscriptions.data[0].default_payment_method.billing_details.name',
      );
      const attribution = {
        id: session.metadata?.attribution_id ?? null,
        url: session.metadata?.attribution_url ?? null,
        type: session.metadata?.attribution_type ?? null,
        referrerSource: session.metadata?.referrer_source ?? null,
        referrerMedium: session.metadata?.referrer_medium ?? null,
        referrerUrl: session.metadata?.referrer_url ?? null,
      };

      if (payerName && !member.get('name')) {
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

    if (checkoutType !== 'upgrade') {
      const ghostSignupContext = /** @type {SignupContext | undefined} */ (
        session.metadata?.ghostSignupContext
      );
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
};
