const errors = require('@tryghost/errors');
const _ = require('lodash');
const { ADMIN, adminWriteOrigin } = require('../../../members-metafields');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const moment = require('moment');

const messages = {
  stripeNotConnected: 'Missing Stripe connection.',
  memberAlreadyExists: 'Member already exists.',
  memberNotFound: 'Member not found.',
  metafieldsWithoutWriter:
    'Custom field values cannot be set by a request with no authenticated user or integration.',
};

// Stored in the action's `context.action_name`; Admin maps it to a display label.
const CUSTOM_FIELDS_EDITED_ACTION = 'custom_fields_edited';

/**
 * @typedef {object} IEmailService
 * @prop {(data: {email: string, requestedType: string}) => Promise<any>} sendEmailWithMagicLink
 */

/**
 * @typedef {object} IStripeService
 * @prop {boolean} configured
 */

/**
 * @typedef {import('../../../offers/application/offer-mapper').OfferDTO} OfferDTO
 */

/**
 * @typedef {object} IGiftsModule
 * @prop {{getMemberPresentations: (memberIds: string[]) => Promise<Map<string, {cadence: 'month' | 'year', currency: string, amount: number}>>}} service
 */

module.exports = class MemberBREADService {
  /**
   * @param {object} deps
   * @param {import('../repositories/member-repository')} deps.memberRepository
   * @param {import('../../../offers/application/offers-api')} deps.offersAPI
   * @param {IEmailService} deps.emailService
   * @param {IStripeService} deps.stripeService
   * @param {import('../../../member-attribution/member-attribution-service')} deps.memberAttributionService
   * @param {import('../../../email-suppression-list/email-suppression-list').IEmailSuppressionList} deps.emailSuppressionList
   * @param {import('../../../settings-helpers/settings-helpers')} deps.settingsHelpers
   * @param {import('./next-payment-calculator')} deps.nextPaymentCalculator
   * @param {IGiftsModule} deps.giftService
   * @param {import('../../../members-metafields/values-service').MetafieldValuesService} deps.metafieldValues Required: boot builds it before the members service
   * @param {<T>(fn: (transacting: import('knex').Knex.Transaction) => Promise<T>) => Promise<T>} deps.transaction
   *   Runs `fn` in a database transaction.
   */
  constructor({
    memberRepository,
    emailService,
    stripeService,
    offersAPI,
    memberAttributionService,
    emailSuppressionList,
    settingsHelpers,
    nextPaymentCalculator,
    commentsService,
    giftService,
    metafieldValues,
    transaction,
  }) {
    this.offersAPI = offersAPI;
    /** @private */
    this.memberRepository = memberRepository;
    /** @private */
    this.emailService = emailService;
    /** @private */
    this.stripeService = stripeService;
    /** @private */
    this.memberAttributionService = memberAttributionService;
    /** @private */
    this.emailSuppressionList = emailSuppressionList;
    /** @private */
    this.settingsHelpers = settingsHelpers;
    /** @private */
    this.nextPaymentCalculator = nextPaymentCalculator;
    /** @private */
    this.commentsService = commentsService;
    /** @private */
    this.giftService = giftService;
    /** @private */
    this.metafieldValues = metafieldValues;
    /** @private */
    this.transaction = transaction;
  }

  /**
   * The member's metafields as this audience may see them, empty if they have none.
   *
   * @param {string} memberId
   * @param {import('../../../members-metafields').Audience} audience
   * @param {{transacting?: import('knex').Knex.Transaction}} [options] reads inside this transaction
   * @returns {Promise<Record<string, Record<string, unknown>>>}
   */
  async readMetafieldsForMember(memberId, audience, { transacting } = {}) {
    return (await this.metafieldValues.getValuesForMember(memberId, audience, transacting)) ?? {};
  }

  /**
   * Each member's metafields as this audience may see them. A member with none has an
   * empty object.
   *
   * @param {string[]} memberIds
   * @param {import('../../../members-metafields').Audience} audience
   * @returns {Promise<Map<string, Record<string, Record<string, unknown>>>>}
   */
  async readMetafieldsForMembers(memberIds, audience) {
    const byMember = await this.metafieldValues.getValuesForMembers(memberIds, audience);
    return new Map(memberIds.map((memberId) => [memberId, byMember.get(memberId) ?? {}]));
  }

  /**
   * @private
   * Adds missing complimentary subscriptions to a member and makes sure the tier of all subscriptions is set correctly.
   * @param {Object} member JSON serialized member
   * @param {Map<string, {cadence: 'month' | 'year', currency: string, amount: number}>} [giftMap] Map of memberId → active redeemed gift, used to populate real price details on synthetic gift subscriptions
   */
  attachSubscriptionsToMember(member, giftMap = new Map()) {
    if (!member.products || !Array.isArray(member.products)) {
      return member;
    }

    const subscriptionProducts = (member.subscriptions || [])
      .filter((sub) => this.memberRepository.isActiveSubscriptionStatus(sub.status))
      .map((sub) => sub.price.product.product_id);

    // Remove incomplete subscriptions from the API
    member.subscriptions = member.subscriptions.filter(
      (sub) => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired',
    );

    // Attach non-Stripe complimentary or gifted subscriptions to member
    // These subscriptions are either granted by the publisher for free (complimentary) or paid by someone else (gift)
    // They are not backed by a Stripe subscription as there isn't any recurring charges
    //
    // In the logic below, we construct Stripe-alike member subscription API responses, so that the client does not need to handle Stripe vs non-Stripe subscriptions separately.
    // Note: a complimentary or gift subscription should always be the current member subscription and match its status,
    // as non-Stripe subscriptions are removed when a member continues with a Stripe paid subscription
    if (member.status === 'comped' || member.status === 'gift') {
      let interval = 'year';
      let currency = 'USD';
      let amount = 0;
      const nickname = member.status === 'gift' ? 'Gift subscription' : 'Complimentary';

      if (member.status === 'gift') {
        const gift = giftMap.get(member.id);
        if (gift) {
          interval = gift.cadence;
          currency = gift.currency;
          amount = gift.amount;
        } else {
          logging.warn(
            `No active gift found for gift member ${member.id} — falling back to default subscription price details.`,
          );
        }
      }

      for (const product of member.products) {
        if (!subscriptionProducts.includes(product.id)) {
          const productAddEvent = member.productEvents.find(
            (event) => event.product_id === product.id && event.action === 'added',
          );
          let startDate;
          if (!productAddEvent) {
            startDate = moment();
          } else {
            startDate = moment(productAddEvent.created_at);
          }

          member.subscriptions.push({
            id: '',
            tier: product,
            customer: {
              id: '',
              name: member.name,
              email: member.email,
            },
            plan: {
              id: '',
              nickname,
              interval,
              currency,
              amount,
            },
            status: 'active',
            start_date: startDate,
            default_payment_card_last4: '****',
            cancel_at_period_end: false,
            cancellation_reason: null,
            current_period_end: product.expiry_at ? moment(product.expiry_at) : null,
            price: {
              id: '',
              price_id: '',
              nickname,
              amount,
              interval,
              type: 'recurring',
              currency,
              product: {
                id: '',
                product_id: product.id,
              },
            },
          });
        }
      }
    }

    for (const subscription of member.subscriptions) {
      if (!subscription.tier) {
        subscription.tier = member.products.find(
          (product) => product.id === subscription.price.product.product_id,
        );
      }
    }
  }

  /**
   * @private Builds a map between subscriptions and their offer representation (from OfferMapper)
   * @returns {Promise<Map<string, OfferDTO>>}
   */
  async fetchSubscriptionOffers(subscriptions) {
    const fetchedOffers = new Map();
    const subscriptionOffers = new Map();

    try {
      for (const subscriptionModel of subscriptions) {
        const offerId = subscriptionModel.get('offer_id');

        if (!offerId) {
          continue;
        }

        let offer = fetchedOffers.get(offerId);
        if (!offer) {
          offer = await this.offersAPI.getOffer({ id: offerId });
          fetchedOffers.set(offerId, offer);
        }

        subscriptionOffers.set(subscriptionModel.get('subscription_id'), offer);
      }
    } catch (e) {
      logging.error(
        `Failed to load offers for subscriptions - ${subscriptions.map((s) => s.id).join(', ')}.`,
      );
      logging.error(e);
    }

    return subscriptionOffers;
  }

  /**
   * @private Builds a map between Stripe subscription IDs and their redeemed offers (from offer_redemptions)
   * @param {import('bookshelf').Model[]} subscriptions - Bookshelf subscription models
   * @returns {Promise<Map<string, OfferDTO[]>>}
   */
  async fetchSubscriptionOfferRedemptions(subscriptions) {
    const subscriptionOfferRedemptions = new Map();

    if (subscriptions.length === 0) {
      return subscriptionOfferRedemptions;
    }

    try {
      const subscriptionIdMap = new Map();
      const subscriptionIds = [];

      for (const subscription of subscriptions) {
        subscriptionIdMap.set(subscription.id, subscription.get('subscription_id'));

        subscriptionIds.push(subscription.id);
      }

      const redemptions = await this.offersAPI.getRedeemedOfferIdsForSubscriptions({
        subscriptionIds,
      });

      const fetchedOffers = new Map();

      for (const redemption of redemptions) {
        const stripeSubId = subscriptionIdMap.get(redemption.subscription_id);

        let offer = fetchedOffers.get(redemption.offer_id);

        if (!offer) {
          offer = await this.offersAPI.getOffer({ id: redemption.offer_id });

          fetchedOffers.set(redemption.offer_id, offer);
        }

        if (offer && stripeSubId) {
          if (!subscriptionOfferRedemptions.has(stripeSubId)) {
            subscriptionOfferRedemptions.set(stripeSubId, []);
          }

          subscriptionOfferRedemptions.get(stripeSubId).push(offer);
        }
      }
    } catch (e) {
      logging.error(
        `Failed to load offer redemptions for subscriptions - ${subscriptions.map((s) => s.id).join(', ')}.`,
      );
      logging.error(e);
    }

    return subscriptionOfferRedemptions;
  }

  /**
   * @private
   * @param {Object} member JSON serialized member
   * @param {Map<string, OfferDTO>} subscriptionOffers result from fetchSubscriptionOffers
   * @param {Map<string, OfferDTO[]>} subscriptionOfferRedemptions result from fetchSubscriptionOfferRedemptions
   */
  attachOffersToSubscriptions(member, subscriptionOffers, subscriptionOfferRedemptions) {
    member.subscriptions = member.subscriptions.map((subscription) => {
      const offer = subscriptionOffers.get(subscription.id);
      subscription.offer = offer || null;
      subscription.offer_redemptions = subscriptionOfferRedemptions.get(subscription.id) || [];
      return subscription;
    });
  }

  /**
   * @private
   * Attaches next_payment information to each subscription
   * Must be called after attachOffersToSubscriptions so that subscription.offer is available
   * @param {Object} member JSON serialized member
   */
  attachNextPaymentToSubscriptions(member) {
    member.subscriptions = member.subscriptions.map((subscription) => {
      subscription.next_payment = this.nextPaymentCalculator.calculate(subscription);
      return subscription;
    });
  }

  /**
   * @private
   * Adds missing complimentary subscriptions to a member and makes sure the tier of all subscriptions is set correctly.
   */
  async attachAttributionsToMember(member, subscriptionIdMap) {
    // Created attribution
    member.attribution = await this.memberAttributionService.getMemberCreatedAttribution(member.id);

    // Subscriptions attributions
    for (const subscription of member.subscriptions) {
      if (!subscription.id) {
        continue;
      }

      // Convert stripe ID to database id
      const id = subscriptionIdMap.get(subscription.id);
      if (!id) {
        continue;
      }
      subscription.attribution =
        await this.memberAttributionService.getSubscriptionCreatedAttribution(id);
    }
  }

  /**
   * @private
   * Fetches active redeemed gifts for any gift-status members in the input list.
   * @param {import('bookshelf').Model[]} members - Bookshelf member models
   * @returns {Promise<Map<string, {cadence: 'month' | 'year', currency: string, amount: number}>>} keyed by member.id → stable gift presentation
   */
  async fetchActiveGiftsForMembers(members) {
    const giftMemberIds = members.filter((m) => m.get('status') === 'gift').map((m) => m.id);

    if (giftMemberIds.length === 0) {
      return new Map();
    }

    try {
      return await this.giftService.service.getMemberPresentations(giftMemberIds);
    } catch (e) {
      logging.error(`Failed to load active gifts for members - ${giftMemberIds.join(', ')}.`);
      logging.error(e);
      return new Map();
    }
  }

  /**
   * @param {object} data
   * @param {object} [options]
   * @param {import('../../../members-metafields').Audience | null} options.metafieldsFor
   *   Who the extra fields a publisher defined are being read for, or null to leave them
   *   off entirely. Null is not the same as "nobody may see them": it means this caller
   *   never shows them, so fetching them is two database queries whose results are thrown
   *   away. Ghost identifies a signed-in reader on every page view of a themed site
   *   through this method, and that caller renders a member through a fixed list of
   *   fields which has never included these.
   *
   *   Defaults to null, so a caller that does not ask gets none of them.
   */
  async read(data, { metafieldsFor = null, ...options } = {}) {
    const defaultWithRelated = [
      'labels',
      'stripeSubscriptions',
      'stripeSubscriptions.customer',
      'stripeSubscriptions.stripePrice',
      'stripeSubscriptions.stripePrice.stripeProduct',
      'stripeSubscriptions.stripePrice.stripeProduct.product',
      // The resolved subscription itself — no nested loads, since the
      // FE finds price/product details in the already-loaded
      // `subscriptions` array via the matching id.
      'currentSubscription',
      'products',
      'newsletters',
    ];

    const withRelated = new Set((options.withRelated || []).concat(defaultWithRelated));

    if (!withRelated.has('productEvents')) {
      withRelated.add('productEvents');
    }

    const model = await this.memberRepository.get(data, {
      ...options,
      withRelated: Array.from(withRelated),
    });

    if (!model) {
      return null;
    }

    // We need to know the real IDs for each subscription to fetch the member attribution
    const subscriptionIdMap = new Map();
    for (const subscription of model.related('stripeSubscriptions')) {
      subscriptionIdMap.set(subscription.get('subscription_id'), subscription.id);
    }

    const member = model.toJSON(options);
    const stripeSubscriptions = model.related('stripeSubscriptions');

    member.subscriptions = member.subscriptions.filter((sub) => !!sub.price);

    const [offerMap, offerRedemptionsMap, giftMap] = await Promise.all([
      this.fetchSubscriptionOffers(stripeSubscriptions),
      this.fetchSubscriptionOfferRedemptions(stripeSubscriptions),
      this.fetchActiveGiftsForMembers([model]),
    ]);
    this.attachSubscriptionsToMember(member, giftMap);
    this.attachOffersToSubscriptions(member, offerMap, offerRedemptionsMap);
    this.attachNextPaymentToSubscriptions(member);
    await this.attachAttributionsToMember(member, subscriptionIdMap);

    const suppressionData = await this.emailSuppressionList.getSuppressionData(member.email);
    member.email_suppression = {
      suppressed: suppressionData.suppressed || !!model.get('email_disabled'),
      info: suppressionData.info,
    };

    const unsubscribeUrl = this.settingsHelpers.createUnsubscribeUrl(member.uuid);
    member.unsubscribe_url = unsubscribeUrl;

    if (metafieldsFor) {
      member.metafields = await this.readMetafieldsForMember(member.id, metafieldsFor);
    }

    return member;
  }

  /**
   * Takes the metafields out of an Admin API member payload and plans their write. Throws on
   * an invalid value, or when the request has no user or integration to name as the writer.
   *
   * @private
   * @param {object} data the member payload, whose `metafields` key is removed
   * @param {object} options
   * @returns {Promise<import('../../../members-metafields/values-service').MetafieldPlan | null>}
   *   null when there is nothing to write
   */
  async planStaffMetafields(data, options) {
    const metafields = this.metafieldValues.unwrapWire(data.metafields);
    delete data.metafields;
    if (metafields === undefined) {
      return null;
    }

    // Planned before the member is touched, so a bad value refuses the whole request.
    const writes = await this.metafieldValues.planWrite(metafields, ADMIN);
    if (writes.length === 0) {
      return null;
    }

    // Every value reaching here was typed into the Admin API, so the writer is
    // whoever made the request — the same pair the action log records, so the two
    // agree about who did it rather than one saying only that it was "admin".
    //
    // The only route to this branch is the authenticated Admin API, so an anonymous
    // request is a mistake somewhere upstream rather than a writer to invent a name
    // for. Refusing keeps every stored writer resolvable.
    const origin = adminWriteOrigin(options.context);
    if (!origin) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.metafieldsWithoutWriter),
      });
    }

    return { writes, origin };
  }

  /**
   * Creates a member and writes their metafields in one transaction. The `member.added`
   * event fires when the transaction commits, so it sees the metafields.
   *
   * @private
   * @param {object} data the member attributes
   * @param {object} options
   * @param {import('../../../members-metafields/values-service').MetafieldPlan} metafields
   */
  async createWithMetafields(data, options, { writes, origin }) {
    return this.transaction(async (transacting) => {
      const model = await this.memberRepository.create(data, { ...options, transacting });
      await this.metafieldValues.applyWrite(model.id, writes, { ...origin, executor: transacting });
      return model;
    });
  }

  async add(data, options) {
    const metafields = await this.planStaffMetafields(data, options);

    if (!this.stripeService.configured && (data.comped || data.stripe_customer_id)) {
      const property = data.comped ? 'comped' : 'stripe_customer_id';
      throw new errors.ValidationError({
        message: tpl(messages.stripeNotConnected),
        context:
          'Attempting to import members with Stripe data when there is no Stripe account connected.',
        help: 'You need to connect to Stripe to import Stripe customers. ',
        property,
      });
    }

    let model;

    try {
      if (data.email && data.email_disabled === undefined) {
        const isSuppressed = (await this.emailSuppressionList.getSuppressionData(data.email))
          ?.suppressed;
        data.email_disabled = !!isSuppressed;
      }

      const attribution = await this.memberAttributionService.getAttributionFromContext(
        options?.context,
      );
      if (attribution) {
        data.attribution = attribution;
      }
      model = metafields
        ? await this.createWithMetafields(data, options, metafields)
        : await this.memberRepository.create(data, options);
    } catch (error) {
      if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
        throw new errors.ValidationError({
          message: tpl(messages.memberAlreadyExists),
          context: 'Attempting to add member with existing email address',
          property: 'email',
        });
      }
      throw error;
    }

    // Only pass specific options to downstream calls, filtering out options like
    // `withRelated` that could cause errors in repositories that don't support them.
    // - transacting: needed for database transaction consistency
    // - context: needed to determine source (admin/api/member/import) for staff notifications
    const sharedOptions = {
      ...(options.transacting && { transacting: options.transacting }),
      ...(options.context && { context: options.context }),
    };

    try {
      if (data.stripe_customer_id) {
        await this.memberRepository.linkStripeCustomer(
          {
            customer_id: data.stripe_customer_id,
            member_id: model.id,
          },
          sharedOptions,
        );
      }
    } catch (error) {
      const isStripeLinkingError =
        error.message && error.message.match(/customer|plan|subscription/g);
      if (isStripeLinkingError) {
        if (error.message.indexOf('customer') && error.code === 'resource_missing') {
          error.message = `Member not imported. ${error.message}`;
          error.context = 'Missing Stripe Customer';
          error.help = "Make sure you're connected to the correct Stripe Account";
        }

        await this.memberRepository.destroy(
          {
            id: model.id,
          },
          options,
        );
      }
      throw error;
    }

    if (options.send_email) {
      await this.emailService.sendEmailWithMagicLink({
        email: model.get('email'),
        requestedType: options.email_type,
      });
    }

    if (data.comped) {
      await this.memberRepository.setComplimentarySubscription(model, sharedOptions);
    }

    return this.read({ id: model.id }, { ...options, metafieldsFor: ADMIN });
  }

  async edit(data, options) {
    delete data.last_seen_at;

    const metafields = await this.planStaffMetafields(data, options);

    let model;

    try {
      // Update email_disabled based on whether the new email is suppressed
      if (data.email) {
        const isSuppressed = (await this.emailSuppressionList.getSuppressionData(data.email))
          ?.suppressed;
        data.email_disabled = !!isSuppressed;
      }

      model = metafields
        ? await this.updateWithMetafields(data, options, [metafields])
        : await this.memberRepository.update(data, options);
    } catch (error) {
      if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
        throw new errors.ValidationError({
          message: tpl(messages.memberAlreadyExists),
          context: 'Attempting to edit member with existing email address',
          property: 'email',
        });
      }

      throw error;
    }

    if (this.stripeService.configured) {
      const hasCompedSubscription = !!model
        .related('stripeSubscriptions')
        .find(
          (sub) => sub.get('plan_nickname') === 'Complimentary' && sub.get('status') === 'active',
        );
      // `comped` is derived from status and round-tripped on every edit, even for members
      // comped without a Stripe subscription (e.g. via the API or an import), so only create
      // a subscription on an actual transition. The model returned by update() still holds
      // the pre-update status. Ref: https://github.com/TryGhost/Ghost/issues/25735
      const wasComped = model.previous('status') === 'comped';

      if (typeof data.comped === 'boolean') {
        if (data.comped && !hasCompedSubscription && !wasComped) {
          await this.memberRepository.setComplimentarySubscription(model, {
            context: options.context,
            transacting: options.transacting,
          });
        } else if (!data.comped && hasCompedSubscription) {
          await this.memberRepository.removeComplimentarySubscription(model, {
            context: options.context,
            transacting: options.transacting,
          });
        }
      }
    }

    return this.read({ id: model.id }, { ...options, metafieldsFor: ADMIN });
  }

  /**
   * Updates a member and writes their metafields in one transaction. The `member.edited`
   * event fires once, when the transaction commits, so it always sees the new metafields.
   * Without writes, updates the member as before.
   *
   * @param {object} data the member attributes to change
   * @param {object} options must name the member by `id`
   * @param {import('../../../members-metafields/values-service').MetafieldPlan[]} plans
   *   applied in order, so where two write one field the last is what it holds
   */
  async updateWithMetafields(data, options, plans) {
    if (plans.every((plan) => plan.writes.length === 0)) {
      return this.memberRepository.update(data, options);
    }

    return this.transaction(async (transacting) => {
      // Locked before anything else reads. On MySQL a transaction reads from a snapshot
      // taken at its first plain read, so an edit that waited on another edit to this
      // member would otherwise read the metafields from before that edit committed.
      await this.memberRepository.get({ id: options.id }, { transacting, forUpdate: true });
      const model = await this.memberRepository.update(data, { ...options, transacting });
      const memberUnchanged = !model._changed || Object.keys(model._changed).length === 0;

      const before = await this.readMetafieldsForMember(model.id, ADMIN, { transacting });
      for (const { writes, origin } of plans) {
        await this.metafieldValues.applyWrite(model.id, writes, {
          ...origin,
          executor: transacting,
        });
      }
      const after = await this.readMetafieldsForMember(model.id, ADMIN, { transacting });
      if (!_.isEqual(before, after)) {
        // Metafields aren't member columns, so the model doesn't keep their old values.
        model._previousMetafields = before;
      }

      if (memberUnchanged) {
        // Metafields aren't a member column or relation, so an edit touching only them
        // leaves `_changed` empty, and the event the save queued would not fire. Marking
        // them as the change lets it fire at commit, as a labels change does.
        model._changed = { metafields: true };
        // The save skipped its audit action, because nothing had changed yet. A mixed
        // edit keeps the generic label: relabelling it would hide the member change.
        await model.addAction(model, 'edited', {
          context: options.context,
          transacting,
          actionName: CUSTOM_FIELDS_EDITED_ACTION,
        });
      }

      return model;
    });
  }

  /**
   * @param {string} memberId
   * @param {string} reason
   * @param {Date|null} until
   * @param {boolean} hideComments
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async disableCommenting(memberId, reason, until, hideComments, context) {
    const model = await this.memberRepository.get({ id: memberId });

    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.memberNotFound),
      });
    }

    const commenting = model.get('commenting');
    const updated = commenting.disable(reason, until);

    await this.memberRepository.saveCommenting(memberId, updated, 'commenting_disabled', context);

    if (hideComments) {
      await this.commentsService.api.bulkUpdateStatus(
        `member_id:'${memberId}'+status:published`,
        'hidden',
      );
    }

    return this.read({ id: memberId }, { metafieldsFor: ADMIN });
  }

  /**
   * @param {string} memberId
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async enableCommenting(memberId, context) {
    const model = await this.memberRepository.get({ id: memberId });

    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.memberNotFound),
      });
    }

    const commenting = model.get('commenting');
    const updated = commenting.enable();

    await this.memberRepository.saveCommenting(memberId, updated, 'commenting_enabled', context);

    return this.read({ id: memberId }, { metafieldsFor: ADMIN });
  }

  async logout(options) {
    await this.memberRepository.cycleTransientId(options);
  }

  async browse(options) {
    const defaultWithRelated = [
      'labels',
      'stripeSubscriptions',
      'stripeSubscriptions.customer',
      'stripeSubscriptions.stripePrice',
      'stripeSubscriptions.stripePrice.stripeProduct',
      'stripeSubscriptions.stripePrice.stripeProduct.product',
      // The resolved subscription itself — no nested loads, since the
      // FE finds price/product details in the already-loaded
      // `subscriptions` array via the matching id.
      'currentSubscription',
      'products',
      'newsletters',
    ];

    if (options.limit === 'all' || options.limit > 100) {
      options.limit = 100;
    }

    const originalWithRelated = options.withRelated || [];

    const withRelated = new Set(originalWithRelated.concat(defaultWithRelated));

    if (!withRelated.has('productEvents')) {
      withRelated.add('productEvents');
    }

    //option param to skip distinct from count query, distinct adds a lot of latency and in this case the result set will always be unique.
    options.useBasicCount = true;

    const page = await this.memberRepository.list({
      ...options,
      withRelated: Array.from(withRelated),
    });

    if (!page) {
      return null;
    }

    const subscriptions = page.data.flatMap((model) =>
      model.related('stripeSubscriptions').slice(),
    );
    const [offerMap, offerRedemptionsMap, giftMap] = await Promise.all([
      this.fetchSubscriptionOffers(subscriptions),
      this.fetchSubscriptionOfferRedemptions(subscriptions),
      this.fetchActiveGiftsForMembers(page.data),
    ]);

    const bulkSuppressionData = await this.emailSuppressionList.getBulkSuppressionData(
      page.data.map((member) => member.get('email')),
    );

    const metafieldsByMember = options.includeMetafields
      ? await this.readMetafieldsForMembers(
          page.data.map((model) => model.id),
          ADMIN,
        )
      : null;

    const data = page.data.map((model, index) => {
      const member = model.toJSON(options);
      member.subscriptions = member.subscriptions.filter((sub) => !!sub.price);
      this.attachSubscriptionsToMember(member, giftMap);
      this.attachOffersToSubscriptions(member, offerMap, offerRedemptionsMap);
      this.attachNextPaymentToSubscriptions(member);
      if (!originalWithRelated.includes('products')) {
        delete member.products;
      }
      if (metafieldsByMember) {
        member.metafields = metafieldsByMember.get(model.id);
      }
      member.email_suppression = {
        suppressed: bulkSuppressionData[index].suppressed || !!model.get('email_disabled'),
        info: bulkSuppressionData[index].info,
      };
      member.unsubscribe_url = this.settingsHelpers.createUnsubscribeUrl(member.uuid);

      return member;
    });

    return {
      data,
      meta: page.meta,
    };
  }
};
