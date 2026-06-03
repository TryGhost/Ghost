const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const moment = require('moment');
const {MEMBER_WELCOME_EMAIL_SLUGS, MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES} = require('../../../member-welcome-emails/constants');

const messages = {
    stripeNotConnected: 'Missing Stripe connection.',
    memberAlreadyExists: 'Member already exists.',
    memberNotFound: 'Member not found.',
    welcomeEmailNotEligible: 'Welcome email is not available for this member\'s status.',
    welcomeEmailNotConfigured: 'No active welcome email is configured.'
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
     */
    constructor({memberRepository, labsService, emailService, stripeService, offersAPI, memberAttributionService, emailSuppressionList, settingsHelpers, nextPaymentCalculator, commentsService, giftService, AutomatedEmailRecipient, Automation}) {
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
        this.AutomatedEmailRecipient = AutomatedEmailRecipient;
        /** @private */
        this.Automation = Automation;
    }

    /**
     * @private
     * Returns the timestamp of the most recent welcome email sent to the member,
     * or null if none has been sent. Reads from the automated_email_recipients
     * table, which is the same source the member activity feed uses.
     * @param {string} memberId
     * @returns {Promise<Date|null>}
     */
    async fetchWelcomeEmailSentAt(memberId) {
        if (!this.AutomatedEmailRecipient || !memberId) {
            return null;
        }

        // automated_email_recipients.automated_email_id is FK'd to
        // welcome_email_automated_emails.id, so every row is a welcome email
        // send by construction. If that table is ever broadened to other
        // automation types, this query (and fetchWelcomeEmailSentAtMap) will
        // need a join filter on the welcome email automation slug.
        try {
            const latest = await this.AutomatedEmailRecipient.forge()
                .query((qb) => {
                    qb.where('member_id', memberId)
                        .orderBy('created_at', 'desc')
                        .limit(1);
                })
                .fetch({require: false});
            return latest ? latest.get('created_at') : null;
        } catch (err) {
            logging.error(`Failed to load welcome email sent timestamp for member ${memberId}.`);
            logging.error(err);
            return null;
        }
    }

    /**
     * @private
     * Bulk version of fetchWelcomeEmailSentAt. Returns a Map<memberId, Date> of
     * the latest welcome email send per member; member ids with no sends are absent.
     * @param {string[]} memberIds
     * @returns {Promise<Map<string, Date>>}
     */
    async fetchWelcomeEmailSentAtMap(memberIds) {
        const map = new Map();
        if (!this.AutomatedEmailRecipient || !memberIds || memberIds.length === 0) {
            return map;
        }

        try {
            const rows = await this.AutomatedEmailRecipient.forge()
                .query((qb) => {
                    qb.whereIn('member_id', memberIds)
                        .orderBy('created_at', 'desc');
                })
                .fetchAll();
            for (const row of rows.models) {
                const memberId = row.get('member_id');
                if (!map.has(memberId)) {
                    map.set(memberId, row.get('created_at'));
                }
            }
        } catch (err) {
            logging.error(`Failed to load welcome email sent timestamps for ${memberIds.length} members.`);
            logging.error(err);
        }

        return map;
    }

    /**
     * @private
     * Maps a member's current status to the status group ('free' or 'paid')
     * accepted by memberRepository.triggerMemberSignupAutomation. Returns null
     * if the status is not eligible for any welcome email automation (e.g. comped).
     * @param {string} memberStatus
     * @returns {'free'|'paid'|null}
     */
    pickWelcomeEmailStatus(memberStatus) {
        for (const [statusGroup, eligibleStatuses] of Object.entries(MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES)) {
            if (eligibleStatuses.includes(memberStatus)) {
                return statusGroup;
            }
        }
        return null;
    }

    /**
     * @private
     * Returns true when there is an active welcome email automation with a
     * lexical body for the given status group. Mirrors the eligibility check
     * inside #triggerMemberSignupLegacyAutomation so the manual send endpoint
     * can report 404 instead of silently no-op'ing.
     * @param {'free'|'paid'} statusGroup
     * @returns {Promise<boolean>}
     */
    async isWelcomeEmailAutomationActive(statusGroup) {
        if (!this.Automation) {
            return false;
        }
        const automation = await this.Automation.findOne(
            {slug: MEMBER_WELCOME_EMAIL_SLUGS[statusGroup]},
            {withRelated: ['welcomeEmailAutomatedEmail']}
        );
        const email = automation?.related('welcomeEmailAutomatedEmail');
        return Boolean(
            automation && email && email.get('lexical') && automation.get('status') === 'active'
        );
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

        member.welcome_email_sent_at = (await this.fetchWelcomeEmailSentAt(member.id)) ?? null;

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

        if (options.send_welcome_email) {
            // memberRepository.create only auto-triggers the welcome email when source is 'member'
            // (i.e. self-signup). Admin-created members are skipped, so trigger it explicitly here
            // when the API caller has opted in.
            //
            // Re-fetch the member: linkStripeCustomer / setComplimentarySubscription above can
            // mutate the persisted status (free → paid/comped) without refreshing the in-memory
            // model, so model.get('status') here would be stale and pick the wrong automation
            // (or none).
            const persisted = await this.memberRepository.get({id: model.id}, sharedOptions);
            const statusGroup = persisted && this.pickWelcomeEmailStatus(persisted.get('status'));
            if (statusGroup) {
                try {
                    await this.memberRepository.triggerMemberSignupAutomation(
                        model.id,
                        model.get('email'),
                        statusGroup,
                        sharedOptions
                    );
                } catch (err) {
                    logging.error(`Failed to trigger welcome email for member ${model.id}.`);
                    logging.error(err);
                }
            }
        }

        return this.read({id: model.id}, options);
    }

    /**
     * Manually triggers the welcome email automation for an existing member.
     * The poller will create an automated_email_recipients row when the email is
     * actually sent, which surfaces in the member's activity feed.
     * @param {string} memberId
     * @param {Object} [options]
     * @returns {Promise<Object>} the updated member, including welcome_email_sent_at
     */
    async sendWelcomeEmail(memberId, options = {}) {
        const model = await this.memberRepository.get({id: memberId});

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound)
            });
        }

        const statusGroup = this.pickWelcomeEmailStatus(model.get('status'));
        if (!statusGroup) {
            throw new errors.BadRequestError({
                message: tpl(messages.welcomeEmailNotEligible)
            });
        }

        // Check existence up front so the API can return 404 — the new public
        // trigger method returns void and silently no-ops when no automation is
        // configured, which we'd otherwise have no way to surface.
        if (!(await this.isWelcomeEmailAutomationActive(statusGroup))) {
            throw new errors.NotFoundError({
                message: tpl(messages.welcomeEmailNotConfigured)
            });
        }

        const sharedOptions = {
            ...(options.transacting && {transacting: options.transacting}),
            ...(options.context && {context: options.context})
        };

        await this.memberRepository.triggerMemberSignupAutomation(
            memberId,
            model.get('email'),
            statusGroup,
            sharedOptions
        );

        return this.read({id: memberId}, options);
    }

    async edit(data, options) {
        delete data.last_seen_at;

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

            if (typeof data.comped === 'boolean') {
                if (data.comped && !hasCompedSubscription) {
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
        const [offerMap, offerRedemptionsMap, giftMap, welcomeEmailSentAtMap] = await Promise.all([
            this.fetchSubscriptionOffers(subscriptions),
            this.fetchSubscriptionOfferRedemptions(subscriptions),
            this.fetchActiveGiftsForMembers(page.data),
            this.fetchWelcomeEmailSentAtMap(page.data.map(model => model.id))
        ]);

        const bulkSuppressionData = await this.emailSuppressionList.getBulkSuppressionData(page.data.map(member => member.get('email')));

        const data = page.data.map((model, index) => {
            const member = model.toJSON(options);
            member.subscriptions = member.subscriptions.filter(sub => !!sub.price);
            this.attachSubscriptionsToMember(member, giftMap);
            this.attachOffersToSubscriptions(member, offerMap, offerRedemptionsMap);
            this.attachNextPaymentToSubscriptions(member);
            if (!originalWithRelated.includes('products')) {
                delete member.products;
            }
            member.email_suppression = {
                suppressed: bulkSuppressionData[index].suppressed || !!model.get('email_disabled'),
                info: bulkSuppressionData[index].info
            };
            member.unsubscribe_url = this.settingsHelpers.createUnsubscribeUrl(member.uuid);
            member.welcome_email_sent_at = welcomeEmailSentAtMap.get(model.id) ?? null;

            return member;
        });

        return {
            data,
            meta: page.meta
        };
    }
};
