const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const moment = require('moment');

const messages = {
    stripeNotConnected: 'Missing Stripe connection.',
    memberAlreadyExists: 'Member already exists.',
    memberNotFound: 'Member not found.'
};

/**
 * @typedef {object} ILabsService
 * @prop {(key: string) => boolean} isSet
 */

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
 * @typedef {object} IGiftServiceWrapper
 * @prop {{getActiveByMembers: (memberIds: string[]) => Promise<Map<string, {cadence: 'month' | 'year', currency: string, amount: number}>>}} service
 */

/**
 * @typedef {object} ICustomFieldsServiceWrapper
 * @prop {{
 *   getValuesForMembers: (memberIds: string[]) => Promise<Map<string, Record<string, unknown>>>,
 *   planWrite: (values: unknown) => Promise<object[]>,
 *   applyWrite: (memberId: string, writes: object[]) => Promise<void>
 * }} values
 */

module.exports = class MemberBREADService {
    /**
     * @param {object} deps
     * @param {import('../repositories/member-repository')} deps.memberRepository
     * @param {import('../../../offers/application/offers-api')} deps.offersAPI
     * @param {ILabsService} deps.labsService
     * @param {IEmailService} deps.emailService
     * @param {IStripeService} deps.stripeService
     * @param {import('../../../member-attribution/member-attribution-service')} deps.memberAttributionService
     * @param {import('../../../email-suppression-list/email-suppression-list').IEmailSuppressionList} deps.emailSuppressionList
     * @param {import('../../../settings-helpers/settings-helpers')} deps.settingsHelpers
     * @param {import('./next-payment-calculator')} deps.nextPaymentCalculator
     * @param {IGiftServiceWrapper} deps.giftService
     * @param {ICustomFieldsServiceWrapper} deps.customFieldsService
     */
    constructor({memberRepository, labsService, emailService, stripeService, offersAPI, memberAttributionService, emailSuppressionList, settingsHelpers, nextPaymentCalculator, commentsService, giftService, customFieldsService}) {
        this.offersAPI = offersAPI;
        /** @private */
        this.memberRepository = memberRepository;
        /** @private */
        this.labsService = labsService;
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
        this.customFieldsService = customFieldsService;
    }

    /**
     * @private
     * Custom field values keyed by member id, or `null` when the feature is off —
     * the flag lives here, so callers just check the result: `null` means omit the
     * `custom_fields` key entirely, keeping a pre-feature member payload identical.
     *
     * A read gets values on the flag alone, with no opt-in include: a member's
     * custom fields are their own data, like labels and tiers, which a read
     * already returns unasked. `include` is for things that are expensive or
     * aggregate (email_recipients, counts), and one flat lookup on a read that
     * already issues a dozen queries is neither. The flag, not an include, is what
     * protects consumers that predate the feature — an include would outlive it
     * and become permanent API surface.
     *
     * Browse is the opposite — opt-in via `include=custom_fields`, exactly how
     * `products`/`tiers` already behave: a read always carries them, a list only
     * when asked. Read and browse must stay format-identical, so a browse that
     * asks gets the same key a read gives unasked.
     * @param {string[]} memberIds
     * @returns {Promise<Map<string, Record<string, unknown>> | null>}
     */
    async fetchCustomFieldValues(memberIds) {
        if (!this.labsService.isSet('membersCustomFields')) {
            return null;
        }

        return this.customFieldsService.values.getValuesForMembers(memberIds);
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
            .filter(sub => this.memberRepository.isActiveSubscriptionStatus(sub.status))
            .map(sub => sub.price.product.product_id);

        // Remove incomplete subscriptions from the API
        member.subscriptions = member.subscriptions.filter(sub => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired');

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
                    logging.warn(`No active gift found for gift member ${member.id} — falling back to default subscription price details.`);
                }
            }

            for (const product of member.products) {
                if (!subscriptionProducts.includes(product.id)) {
                    const productAddEvent = member.productEvents.find(event => event.product_id === product.id && event.action === 'added');
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
                            email: member.email
                        },
                        plan: {
                            id: '',
                            nickname,
                            interval,
                            currency,
                            amount
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
                                product_id: product.id
                            }
                        }
                    });
                }
            }
        }

        for (const subscription of member.subscriptions) {
            if (!subscription.tier) {
                subscription.tier = member.products.find(product => product.id === subscription.price.product.product_id);
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
                    offer = await this.offersAPI.getOffer({id: offerId});
                    fetchedOffers.set(offerId, offer);
                }

                subscriptionOffers.set(subscriptionModel.get('subscription_id'), offer);
            }
        } catch (e) {
            logging.error(`Failed to load offers for subscriptions - ${subscriptions.map(s => s.id).join(', ')}.`);
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
                subscriptionIds
            });

            const fetchedOffers = new Map();

            for (const redemption of redemptions) {
                const stripeSubId = subscriptionIdMap.get(redemption.subscription_id);

                let offer = fetchedOffers.get(redemption.offer_id);

                if (!offer) {
                    offer = await this.offersAPI.getOffer({id: redemption.offer_id});

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
            logging.error(`Failed to load offer redemptions for subscriptions - ${subscriptions.map(s => s.id).join(', ')}.`);
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
            subscription.attribution = await this.memberAttributionService.getSubscriptionCreatedAttribution(id);
        }
    }

    /**
     * @private
     * Fetches active redeemed gifts for any gift-status members in the input list.
     * @param {import('bookshelf').Model[]} members - Bookshelf member models
     * @returns {Promise<Map<string, {cadence: 'month' | 'year', currency: string, amount: number}>>} keyed by member.id → active Gift
     */
    async fetchActiveGiftsForMembers(members) {
        const giftMemberIds = members
            .filter(m => m.get('status') === 'gift')
            .map(m => m.id);

        if (giftMemberIds.length === 0) {
            return new Map();
        }

        try {
            return await this.giftService.service.getActiveByMembers(giftMemberIds);
        } catch (e) {
            logging.error(`Failed to load active gifts for members - ${giftMemberIds.join(', ')}.`);
            logging.error(e);
            return new Map();
        }
    }

    async read(data, options = {}) {
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
            'newsletters'
        ];

        const withRelated = new Set((options.withRelated || []).concat(defaultWithRelated));

        if (!withRelated.has('productEvents')) {
            withRelated.add('productEvents');
        }

        const model = await this.memberRepository.get(data, {
            ...options,
            withRelated: Array.from(withRelated)
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

        member.subscriptions = member.subscriptions.filter(sub => !!sub.price);

        const [offerMap, offerRedemptionsMap, giftMap] = await Promise.all([
            this.fetchSubscriptionOffers(stripeSubscriptions),
            this.fetchSubscriptionOfferRedemptions(stripeSubscriptions),
            this.fetchActiveGiftsForMembers([model])
        ]);
        this.attachSubscriptionsToMember(member, giftMap);
        this.attachOffersToSubscriptions(member, offerMap, offerRedemptionsMap);
        this.attachNextPaymentToSubscriptions(member);
        await this.attachAttributionsToMember(member, subscriptionIdMap);

        const suppressionData = await this.emailSuppressionList.getSuppressionData(member.email);
        member.email_suppression = {
            suppressed: suppressionData.suppressed || !!model.get('email_disabled'),
            info: suppressionData.info
        };

        const unsubscribeUrl = this.settingsHelpers.createUnsubscribeUrl(member.uuid);
        member.unsubscribe_url = unsubscribeUrl;

        const customFields = await this.fetchCustomFieldValues([member.id]);
        if (customFields) {
            member.custom_fields = customFields.get(member.id) ?? {};
        }

        return member;
    }

    async add(data, options) {
        if (!this.stripeService.configured && (data.comped || data.stripe_customer_id)) {
            const property = data.comped ? 'comped' : 'stripe_customer_id';
            throw new errors.ValidationError({
                message: tpl(messages.stripeNotConnected),
                context: 'Attempting to import members with Stripe data when there is no Stripe account connected.',
                help: 'You need to connect to Stripe to import Stripe customers. ',
                property
            });
        }

        let model;

        try {
            if (data.email && data.email_disabled === undefined) {
                const isSuppressed = (await this.emailSuppressionList.getSuppressionData(data.email))?.suppressed;
                data.email_disabled = !!isSuppressed;
            }

            const attribution = await this.memberAttributionService.getAttributionFromContext(options?.context);
            if (attribution) {
                data.attribution = attribution;
            }
            model = await this.memberRepository.create(data, options);
        } catch (error) {
            if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                throw new errors.ValidationError({
                    message: tpl(messages.memberAlreadyExists),
                    context: 'Attempting to add member with existing email address',
                    property: 'email'
                });
            }
            throw error;
        }

        // Only pass specific options to downstream calls, filtering out options like
        // `withRelated` that could cause errors in repositories that don't support them.
        // - transacting: needed for database transaction consistency
        // - context: needed to determine source (admin/api/member/import) for staff notifications
        const sharedOptions = {
            ...(options.transacting && {transacting: options.transacting}),
            ...(options.context && {context: options.context})
        };

        try {
            if (data.stripe_customer_id) {
                await this.memberRepository.linkStripeCustomer({
                    customer_id: data.stripe_customer_id,
                    member_id: model.id
                }, sharedOptions);
            }
        } catch (error) {
            const isStripeLinkingError = error.message && (error.message.match(/customer|plan|subscription/g));
            if (isStripeLinkingError) {
                if (error.message.indexOf('customer') && error.code === 'resource_missing') {
                    error.message = `Member not imported. ${error.message}`;
                    error.context = 'Missing Stripe Customer';
                    error.help = 'Make sure you\'re connected to the correct Stripe Account';
                }

                await this.memberRepository.destroy({
                    id: model.id
                }, options);
            }
            throw error;
        }

        if (options.send_email) {
            await this.emailService.sendEmailWithMagicLink({
                email: model.get('email'), requestedType: options.email_type
            });
        }

        if (data.comped) {
            await this.memberRepository.setComplimentarySubscription(model, sharedOptions);
        }

        return this.read({id: model.id}, options);
    }

    async edit(data, options) {
        delete data.last_seen_at;

        // Values live in their own table, so they come off the member data before
        // the repository sees it — `custom_fields` is not a member column. It only
        // reaches here at all when the flag is on (the input validator strips it
        // otherwise), so its presence is the signal to write.
        const customFields = data.custom_fields;
        const writeCustomFields = customFields !== undefined;
        delete data.custom_fields;

        // Plan (which validates) before the member is touched, so a bad value 422s
        // here rather than after the member edit has been applied — and keep the
        // plan to apply once below, so the values aren't resolved and validated
        // twice.
        const plannedCustomFields = writeCustomFields
            ? await this.customFieldsService.values.planWrite(customFields)
            : null;

        let model;

        try {
            // Update email_disabled based on whether the new email is suppressed
            if (data.email) {
                const isSuppressed = (await this.emailSuppressionList.getSuppressionData(data.email))?.suppressed;
                data.email_disabled = !!isSuppressed;
            }

            model = await this.memberRepository.update(data, options);
        } catch (error) {
            if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                throw new errors.ValidationError({
                    message: tpl(messages.memberAlreadyExists),
                    context: 'Attempting to edit member with existing email address',
                    property: 'email'
                });
            }

            throw error;
        }

        if (this.stripeService.configured) {
            const hasCompedSubscription = !!model.related('stripeSubscriptions').find(sub => sub.get('plan_nickname') === 'Complimentary' && sub.get('status') === 'active');
            // `comped` is derived from status and round-tripped on every edit, even for members
            // comped without a Stripe subscription (e.g. via the API or an import), so only create
            // a subscription on an actual transition. The model returned by update() still holds
            // the pre-update status. Ref: https://github.com/TryGhost/Ghost/issues/25735
            const wasComped = model.previous('status') === 'comped';

            if (typeof data.comped === 'boolean') {
                if (data.comped && !hasCompedSubscription && !wasComped) {
                    await this.memberRepository.setComplimentarySubscription(model, {
                        context: options.context,
                        transacting: options.transacting
                    });
                } else if (!(data.comped) && hasCompedSubscription) {
                    await this.memberRepository.removeComplimentarySubscription(model, {
                        context: options.context,
                        transacting: options.transacting
                    });
                }
            }
        }

        if (plannedCustomFields) {
            await this.customFieldsService.values.applyWrite(model.id, plannedCustomFields);

            // Custom fields aren't a member column or relation, so an edit touching
            // only them leaves `model._changed` empty and the save fires nothing.
            // Declare the change into `_changed` — as bookshelf-relations does for a
            // labels change — so the member's edited lifecycle fires its usual signals
            // (audit action + the webhook event, no `updated_at` bump).
            //
            // Guarded to the row-unchanged case: a real member change already
            // populated `_changed` and fired the edited event during update(), so
            // re-firing would duplicate it (this also covers a full PUT that resends
            // unchanged member fields — `_changed` stays empty there too). That
            // combined event omits `custom_fields` from `_changed`, which nothing
            // reads: custom fields aren't in the webhook payload (they're injected
            // into read/browse responses, not the model), and `_changed` only gates
            // whether the event fires.
            const memberUnchanged = !model._changed || Object.keys(model._changed).length === 0;
            if (memberUnchanged && plannedCustomFields.length > 0) {
                model._changed = {custom_fields: true};
                const eventOptions = {context: options.context, transacting: options.transacting};
                await model.triggerThen('updated', model, eventOptions);
            }
        }

        return this.read({id: model.id}, options);
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
        const model = await this.memberRepository.get({id: memberId});

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound)
            });
        }

        const commenting = model.get('commenting');
        const updated = commenting.disable(reason, until);

        await this.memberRepository.saveCommenting(
            memberId,
            updated,
            'commenting_disabled',
            context
        );

        if (hideComments) {
            await this.commentsService.api.bulkUpdateStatus(`member_id:'${memberId}'+status:published`, 'hidden');
        }

        return this.read({id: memberId});
    }

    /**
     * @param {string} memberId
     * @param {Object} context
     * @returns {Promise<Object>}
     */
    async enableCommenting(memberId, context) {
        const model = await this.memberRepository.get({id: memberId});

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound)
            });
        }

        const commenting = model.get('commenting');
        const updated = commenting.enable();

        await this.memberRepository.saveCommenting(
            memberId,
            updated,
            'commenting_enabled',
            context
        );

        return this.read({id: memberId});
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
            'newsletters'
        ];

        if (options.limit === 'all' || options.limit > 100) {
            options.limit = 100;
        }

        const originalWithRelated = options.withRelated || [];

        const withRelated = new Set((originalWithRelated).concat(defaultWithRelated));

        if (!withRelated.has('productEvents')) {
            withRelated.add('productEvents');
        }

        //option param to skip distinct from count query, distinct adds a lot of latency and in this case the result set will always be unique.
        options.useBasicCount = true;

        const page = await this.memberRepository.list({
            ...options,
            withRelated: Array.from(withRelated)
        });

        if (!page) {
            return null;
        }

        const subscriptions = page.data.flatMap(model => model.related('stripeSubscriptions').slice());
        const [offerMap, offerRedemptionsMap, giftMap] = await Promise.all([
            this.fetchSubscriptionOffers(subscriptions),
            this.fetchSubscriptionOfferRedemptions(subscriptions),
            this.fetchActiveGiftsForMembers(page.data)
        ]);

        const bulkSuppressionData = await this.emailSuppressionList.getBulkSuppressionData(page.data.map(member => member.get('email')));

        // One query for the whole page, not one per member. `null` when the flag
        // is off or the caller didn't ask — the same truthiness guard read uses.
        const customFieldsByMember = options.includeCustomFields
            ? await this.fetchCustomFieldValues(page.data.map(model => model.id))
            : null;

        const data = page.data.map((model, index) => {
            const member = model.toJSON(options);
            member.subscriptions = member.subscriptions.filter(sub => !!sub.price);
            this.attachSubscriptionsToMember(member, giftMap);
            this.attachOffersToSubscriptions(member, offerMap, offerRedemptionsMap);
            this.attachNextPaymentToSubscriptions(member);
            if (!originalWithRelated.includes('products')) {
                delete member.products;
            }
            if (customFieldsByMember) {
                member.custom_fields = customFieldsByMember.get(model.id) ?? {};
            }
            member.email_suppression = {
                suppressed: bulkSuppressionData[index].suppressed || !!model.get('email_disabled'),
                info: bulkSuppressionData[index].info
            };
            member.unsubscribe_url = this.settingsHelpers.createUnsubscribeUrl(member.uuid);

            return member;
        });

        return {
            data,
            meta: page.meta
        };
    }
};
