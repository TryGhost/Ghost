const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const DomainEvents = require('@tryghost/domain-events');
const {SubscriptionActivatedEvent, MemberCreatedEvent, SubscriptionCreatedEvent, MemberSubscribeEvent, SubscriptionCancelledEvent, OfferRedemptionEvent} = require('../../../../../shared/events');
const ObjectId = require('bson-objectid').default;
const {NotFoundError} = require('@tryghost/errors');
const validator = require('@tryghost/validator');
const crypto = require('crypto');
const StartOutboxProcessingEvent = require('../../../outbox/events/start-outbox-processing-event');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../member-welcome-emails/constants');
const messages = {
    noStripeConnection: 'Cannot {action} without a Stripe Connection',
    moreThanOneProduct: 'A member cannot have more than one Product',
    addProductWithActiveSubscription: 'Cannot add comped Products to a Member with active Subscriptions',
    deleteProductWithActiveSubscription: 'Cannot delete a non-comped Product from a Member, because it has an active Subscription for the same product',
    memberNotFound: 'Could not find Member {id}',
    subscriptionNotFound: 'Could not find Subscription {id}',
    productNotFound: 'Could not find Product {id}',
    bulkActionRequiresFilter: 'Cannot perform {action} without a filter or all=true',
    tierArchived: 'Cannot use archived Tiers',
    invalidEmail: 'Invalid Email',
    offerNotFound: 'Could not find Offer {id}',
    offerNotActive: 'Offer is not active',
    offerIsTrialOffer: 'Trial offers cannot be applied to existing subscriptions',
    offerIsSignupOffer: 'Signup offers cannot be applied to existing subscriptions',
    offerNoCoupon: 'Offer does not have a valid coupon',
    offerTierMismatch: 'Offer is not valid for this subscription tier',
    offerCadenceMismatch: 'Offer is not valid for this subscription cadence',
    offerAlreadyRedeemed: 'This offer has already been redeemed on this subscription',
    subscriptionNotActive: 'Cannot apply offer to an inactive subscription',
    subscriptionHasOffer: 'Subscription already has an offer applied',
    subscriptionInTrial: 'Cannot apply offer to a subscription in a trial period'
};

const SUBSCRIPTION_STATUS_TRIALING = 'trialing';

const WELCOME_EMAIL_SOURCES = ['member'];

/**
 * @typedef {object} ITokenService
 * @prop {(token: string) => Promise<import('jsonwebtoken').JwtPayload>} decodeToken
 */

module.exports = class MemberRepository {
    /**
     * @param {object} deps
     * @param {any} deps.Member
     * @param {any} deps.MemberNewsletter
     * @param {any} deps.MemberCancelEvent
     * @param {any} deps.MemberSubscribeEventModel
     * @param {any} deps.MemberEmailChangeEvent
     * @param {any} deps.MemberPaidSubscriptionEvent
     * @param {any} deps.MemberStatusEvent
     * @param {any} deps.MemberProductEvent
     * @param {any} deps.StripeCustomer
     * @param {any} deps.StripeCustomerSubscription
     * @param {any} deps.OfferRedemption
     * @param {any} deps.Outbox
     * @param {import('../../services/stripe-api')} deps.stripeAPIService
     * @param {any} deps.labsService
     * @param {any} deps.productRepository
     * @param {any} deps.offersAPI
     * @param {ITokenService} deps.tokenService
     * @param {any} deps.newslettersService
     * @param {any} deps.AutomatedEmail
     */
    constructor({
        Member,
        MemberNewsletter,
        MemberCancelEvent,
        MemberSubscribeEventModel,
        MemberEmailChangeEvent,
        MemberPaidSubscriptionEvent,
        MemberStatusEvent,
        MemberProductEvent,
        StripeCustomer,
        StripeCustomerSubscription,
        OfferRedemption,
        Outbox,
        stripeAPIService,
        labsService,
        productRepository,
        offersAPI,
        tokenService,
        newslettersService,
        AutomatedEmail
    }) {
        this._Member = Member;
        this._MemberNewsletter = MemberNewsletter;
        this._MemberCancelEvent = MemberCancelEvent;
        this._MemberSubscribeEvent = MemberSubscribeEventModel;
        this._MemberEmailChangeEvent = MemberEmailChangeEvent;
        this._MemberPaidSubscriptionEvent = MemberPaidSubscriptionEvent;
        this._MemberStatusEvent = MemberStatusEvent;
        this._MemberProductEvent = MemberProductEvent;
        this._OfferRedemption = OfferRedemption;
        this._Outbox = Outbox;
        this._StripeCustomer = StripeCustomer;
        this._StripeCustomerSubscription = StripeCustomerSubscription;
        this._stripeAPIService = stripeAPIService;
        this._productRepository = productRepository;
        this._offersAPI = offersAPI;
        this.tokenService = tokenService;
        this._newslettersService = newslettersService;
        this._labsService = labsService;
        this._AutomatedEmail = AutomatedEmail;

        DomainEvents.subscribe(OfferRedemptionEvent, async function (event) {
            if (!event.data.offerId) {
                return;
            }

            // To be extra safe, check if the redemption already exists before adding it
            const existingRedemption = await OfferRedemption.findOne({
                member_id: event.data.memberId,
                subscription_id: event.data.subscriptionId,
                offer_id: event.data.offerId
            });

            if (!existingRedemption) {
                await OfferRedemption.add({
                    member_id: event.data.memberId,
                    subscription_id: event.data.subscriptionId,
                    offer_id: event.data.offerId,
                    created_at: event.timestamp || Date.now()
                });
            }
        });
    }

    dispatchEvent(event, options) {
        if (options?.transacting) {
            // Only dispatch the event after the transaction has finished
            options.transacting.executionPromise.then(async () => {
                DomainEvents.dispatch(event);
            }).catch((err) => {
                // catches transaction errors/rollback to not dispatch event
                logging.error({
                    err,
                    message: `Error dispatching event ${event.constructor.name} for member ${event.data.memberId} after transaction finished`
                });
            });
        } else {
            DomainEvents.dispatch(event);
        }
    }

    isActiveSubscriptionStatus(status) {
        return ['active', 'trialing', 'unpaid', 'past_due'].includes(status);
    }

    isComplimentarySubscription(subscription) {
        return subscription.plan && subscription.plan.nickname && subscription.plan.nickname.toLowerCase() === 'complimentary';
    }

    /**
     * Maps the framework context to members_*.source table record value
     * @param {Object} context instance of ghost framework context object
     * @returns {'import' | 'system' | 'api' | 'admin' | 'member'}
     */
    _resolveContextSource(context) {
        let source;

        if (context.import || context.importer) {
            source = 'import';
        } else if (context.internal) {
            source = 'system';
        } else if (context.api_key) {
            source = 'api';
        } else if (context.user) {
            source = 'admin';
        } else {
            source = 'member';
        }

        return source;
    }

    getMRR({interval, amount, status = null, canceled = false, discount = null}) {
        if (status === 'trialing') {
            return 0;
        }
        if (status === 'incomplete') {
            return 0;
        }
        if (status === 'incomplete_expired') {
            return 0;
        }
        if (status === 'canceled') {
            return 0;
        }

        if (canceled) {
            return 0;
        }

        let amountWithDiscount = amount;

        if (discount && discount.end === null && discount.coupon && discount.coupon.duration === 'forever') {
            // Discounts should only get applied when they are 'forever' discounts / they don't have an end date
            if (discount.coupon.amount_off !== null) {
                amountWithDiscount = Math.max(0, amountWithDiscount - discount.coupon.amount_off);
            } else {
                amountWithDiscount = Math.round((amountWithDiscount * (100 - discount.coupon.percent_off)) / 100);
            }
        }

        if (interval === 'year') {
            return Math.floor(amountWithDiscount / 12);
        }

        if (interval === 'month') {
            return amountWithDiscount;
        }

        if (interval === 'week') {
            return amountWithDiscount * 4;
        }

        if (interval === 'day') {
            return amountWithDiscount * 30;
        }
    }

    async get(data, options) {
        if (data.customer_id) {
            const customer = await this._StripeCustomer.findOne({
                customer_id: data.customer_id
            }, {
                withRelated: ['member']
            });
            if (customer) {
                return customer.related('member');
            }
            return null;
        }
        return await this._Member.findOne(data, options);
    }

    async getByToken(token, options) {
        const data = await this.tokenService.decodeToken(token);

        return this.get({
            email: data.sub
        }, options);
    }

    _generateTransientId() {
        return crypto.randomUUID();
    }

    async cycleTransientId({id, email}) {
        await this.update({
            transient_id: this._generateTransientId()
        }, {id, email});
    }

    /**
     * Create a member
     * @param {Object} data
     * @param {string} data.email
     * @param {string} [data.name]
     * @param {string} [data.note]
     * @param {(string|Object)[]} [data.labels]
     * @param {boolean} [data.subscribed] (deprecated)
     * @param {string} [data.geolocation]
     * @param {Date} [data.created_at]
     * @param {Object[]} [data.products]
     * @param {Object[]} [data.newsletters]
     * @param {Object} [data.stripeCustomer]
     * @param {string} [data.offerId]
     * @param {import('@tryghost/member-attribution/lib/Attribution').AttributionResource} [data.attribution]
     * @param {boolean} [data.email_disabled]
     * @param {*} options
     * @returns
     */
    async create(data, options) {
        if (!options) {
            options = {};
        }

        if (!options.batch_id) {
            // We'll use this to link related events
            options.batch_id = ObjectId().toHexString();
        }

        const {labels, stripeCustomer, offerId, attribution} = data;

        if (labels) {
            labels.forEach((label, index) => {
                if (typeof label === 'string') {
                    labels[index] = {name: label};
                }
            });
        }

        const memberData = _.pick(data, ['email', 'name', 'note', 'subscribed', 'geolocation', 'created_at', 'products', 'newsletters', 'email_disabled']);

        // Generate a random transient_id
        memberData.transient_id = await this._generateTransientId();

        // Throw error if email is invalid using latest validator
        if (!validator.isEmail(memberData.email, {legacy: false})) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidEmail),
                property: 'email'
            });
        }

        memberData.email_disabled = !!memberData.email_disabled;

        if (memberData.products && memberData.products.length > 1) {
            throw new errors.BadRequestError({message: tpl(messages.moreThanOneProduct)});
        }

        if (memberData.products) {
            for (const productData of memberData.products) {
                const product = await this._productRepository.get(productData);
                if (product.get('active') !== true) {
                    throw new errors.BadRequestError({message: tpl(messages.tierArchived)});
                }
            }
        }

        const memberStatusData = {
            status: 'free'
        };

        if (memberData.products && memberData.products.length === 1) {
            memberStatusData.status = 'comped';
        }

        // Subscribe members to default newsletters
        if (memberData.subscribed !== false && !memberData.newsletters) {
            const browseOptions = _.pick(options, 'transacting');
            memberData.newsletters = await this.getSubscribeOnSignupNewsletters(browseOptions);
        }

        const withRelated = options.withRelated ? options.withRelated : [];
        if (!withRelated.includes('labels')) {
            withRelated.push('labels');
        }
        if (!withRelated.includes('newsletters')) {
            withRelated.push('newsletters');
        }

        const context = options && options.context || {};
        const source = this._resolveContextSource(context);
        const eventData = _.pick(data, ['created_at']);

        const memberAddOptions = {...(options || {}), withRelated};
        let member;

        const welcomeEmailsEnabled = this._labsService.isSet('welcomeEmails');
        if (welcomeEmailsEnabled && WELCOME_EMAIL_SOURCES.includes(source)) {
            const freeWelcomeEmail = this._AutomatedEmail ? await this._AutomatedEmail.findOne({slug: MEMBER_WELCOME_EMAIL_SLUGS.free}) : null;
            const isFreeWelcomeEmailActive = freeWelcomeEmail && freeWelcomeEmail.get('lexical') && freeWelcomeEmail.get('status') === 'active';
            const isFreeSignup = !stripeCustomer;

            const runMemberCreation = async (transacting) => {
                const newMember = await this._Member.add({
                    ...memberData,
                    ...memberStatusData,
                    labels
                }, {...memberAddOptions, transacting});

                // Only send the free welcome email if:
                // 1. The free welcome email is active
                // 2. The member is not signing up for a paid subscription (no stripeCustomer)
                if (isFreeWelcomeEmailActive && isFreeSignup) {
                    const timestamp = eventData.created_at || newMember.get('created_at');

                    await this._Outbox.add({
                        id: ObjectId().toHexString(),
                        event_type: MemberCreatedEvent.name,
                        payload: JSON.stringify({
                            memberId: newMember.id,
                            uuid: newMember.get('uuid'),
                            email: newMember.get('email'),
                            name: newMember.get('name'),
                            source,
                            timestamp,
                            status: 'free'
                        })
                    }, {transacting});
                }

                return newMember;
            };

            if (memberAddOptions.transacting) {
                member = await runMemberCreation(memberAddOptions.transacting);
            } else {
                member = await this._Member.transaction(runMemberCreation);
            }

            if (isFreeWelcomeEmailActive && isFreeSignup) {
                this.dispatchEvent(StartOutboxProcessingEvent.create({memberId: member.id}), memberAddOptions);
            }
        } else {
            member = await this._Member.add({
                ...memberData,
                ...memberStatusData,
                labels
            }, memberAddOptions);
        }

        if (!eventData.created_at) {
            eventData.created_at = member.get('created_at');
        }

        for (const product of member.related('products').models) {
            await this._MemberProductEvent.add({
                member_id: member.id,
                product_id: product.id,
                action: 'added'
            }, options);
        }

        await this._MemberStatusEvent.add({
            member_id: member.id,
            from_status: null,
            to_status: member.get('status'),
            ...eventData
        }, options);

        const newsletters = member.related('newsletters').models;

        for (const newsletter of newsletters) {
            await this._MemberSubscribeEvent.add({
                member_id: member.id,
                newsletter_id: newsletter.id,
                subscribed: true,
                source,
                ...eventData
            }, options);
        }

        if (newsletters && newsletters.length > 0) {
            this.dispatchEvent(MemberSubscribeEvent.create({
                memberId: member.id,
                source: source
            }, eventData.created_at), options);
        }

        // For paid members created via stripe checkout webhook event, link subscription
        if (stripeCustomer) {
            await this.upsertCustomer({
                member_id: member.id,
                customer_id: stripeCustomer.id,
                name: stripeCustomer.name,
                email: stripeCustomer.email
            });

            for (const subscription of stripeCustomer.subscriptions.data) {
                try {
                    await this.linkSubscription({
                        id: member.id,
                        subscription,
                        offerId,
                        attribution
                    }, {batch_id: options.batch_id});
                } catch (err) {
                    if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                        throw err;
                    }
                    throw new errors.ConflictError({
                        err
                    });
                }
            }
        }
        this.dispatchEvent(MemberCreatedEvent.create({
            memberId: member.id,
            batchId: options.batch_id,
            attribution: data.attribution,
            source
        }, eventData.created_at), options);

        return member;
    }

    async getSubscribeOnSignupNewsletters(browseOptions) {
        // By default subscribe to all active auto opt-in newsletters with members visibility
        //TODO: Will mostly need to be updated later for paid-only newsletters
        browseOptions.filter = 'status:active+subscribe_on_signup:true+visibility:members';
        const newsletters = await this._newslettersService.getAll(browseOptions);
        return newsletters || [];
    }

    async update(data, options) {
        const sharedOptions = {
            transacting: options.transacting
        };

        if (!options) {
            options = {};
        }

        const withRelated = options.withRelated ? options.withRelated : [];
        if (!withRelated.includes('labels')) {
            withRelated.push('labels');
        }
        if (!withRelated.includes('newsletters')) {
            withRelated.push('newsletters');
        }

        const memberData = _.pick(data, [
            'email',
            'name',
            'note',
            'subscribed',
            'labels',
            'geolocation',
            'products',
            'newsletters',
            'enable_comment_notifications',
            'last_seen_at',
            'last_commented_at',
            'expertise',
            'email_disabled',
            'transient_id'
        ]);

        // Trim whitespaces from expertise
        if (memberData.expertise) {
            memberData.expertise = memberData.expertise.trim();
        }

        // Determine if we need to fetch the initial member with relations
        const needsProducts = this._stripeAPIService.configured && data.products;

        // only update newsletters if we are receiving newsletter data
        const needsNewsletters = memberData.newsletters || typeof memberData.subscribed === 'boolean';

        // Build list for withRelated
        const requiredRelations = [];
        if (needsNewsletters) {
            requiredRelations.push('newsletters');
        }
        if (needsProducts) {
            requiredRelations.push('products');
        }

        // Fetch the member
        let initialMember = await this._Member.findOne({
            id: options.id
        }, {...sharedOptions, withRelated: requiredRelations, require: false});

        // Make sure we throw the right error if it doesn't exist
        if (!initialMember) {
            throw new NotFoundError({message: tpl(messages.memberNotFound, {id: options.id})});
        }

        // Throw error if email is invalid and it's been changed
        if (
            initialMember?.get('email') && memberData.email
            && initialMember.get('email') !== memberData.email
            && !validator.isEmail(memberData.email, {legacy: false})
        ) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidEmail),
                property: 'email'
            });
        }

        const memberStatusData = {};

        let productsToAdd = [];
        let productsToRemove = [];
        if (needsProducts) {
            const existingProducts = initialMember.related('products').models;
            const existingProductIds = existingProducts.map(product => product.id);
            const incomingProductIds = data.products.map(product => product.id);

            if (incomingProductIds.length > 1 && incomingProductIds.length > existingProductIds.length) {
                throw new errors.BadRequestError({message: tpl(messages.moreThanOneProduct)});
            }

            productsToAdd = _.differenceWith(incomingProductIds, existingProductIds);
            productsToRemove = _.differenceWith(existingProductIds, incomingProductIds);
            const productsToModify = productsToAdd.concat(productsToRemove);

            if (productsToModify.length !== 0) {
                // Load active subscriptions information
                await initialMember.load(
                    [
                        'stripeSubscriptions',
                        'stripeSubscriptions.stripePrice',
                        'stripeSubscriptions.stripePrice.stripeProduct',
                        'stripeSubscriptions.stripePrice.stripeProduct.product'
                    ], sharedOptions);

                const exisitingSubscriptions = initialMember.related('stripeSubscriptions')?.models ?? [];

                if (productsToRemove.length > 0) {
                    // Only allow to delete comped products without a subscription attached to them
                    // Other products should be removed by canceling them via the related stripe subscription
                    const dontAllowToRemoveProductsIds = exisitingSubscriptions
                        .filter(sub => this.isActiveSubscriptionStatus(sub.get('status')))
                        .map(sub => sub.related('stripePrice')?.related('stripeProduct')?.get('product_id'));

                    for (const deleteId of productsToRemove) {
                        if (dontAllowToRemoveProductsIds.includes(deleteId)) {
                            throw new errors.BadRequestError({message: tpl(messages.deleteProductWithActiveSubscription)});
                        }
                    }

                    if (incomingProductIds.length === 0) {
                        // CASE: We are removing all (comped) products from a member & there were no active subscriptions - the member is "free"
                        memberStatusData.status = 'free';
                    }
                }

                if (productsToAdd.length > 0) {
                    // Don't allow to add complimentary subscriptions (= creating a new product) when the member already has an active
                    // subscription
                    const existingActiveSubscriptions = exisitingSubscriptions.filter((subscription) => {
                        return this.isActiveSubscriptionStatus(subscription.get('status'));
                    });

                    if (existingActiveSubscriptions.length) {
                        throw new errors.BadRequestError({message: tpl(messages.addProductWithActiveSubscription)});
                    }

                    // CASE: We are changing products & there were not active stripe subscriptions - the member is "comped"
                    memberStatusData.status = 'comped';
                }
            }
        }

        for (const productId of productsToAdd) {
            const product = await this._productRepository.get({id: productId}, sharedOptions);
            if (!product) {
                throw new errors.BadRequestError({
                    message: tpl(messages.productNotFound, {
                        id: productId
                    })
                });
            }

            if (product.get('active') !== true) {
                throw new errors.BadRequestError({message: tpl(messages.tierArchived)});
            }
        }

        // Keep track of the newsletters that were added and removed of a member so we can generate the corresponding events
        let newslettersToAdd = [];
        let newslettersToRemove = [];

        if (needsNewsletters) {
            const existingNewsletters = initialMember.related('newsletters').models;
            // This maps the old subscribed property to the new newsletters field and is only used to keep backward compatibility
            if (!memberData.newsletters) {
                if (memberData.subscribed === false) {
                    memberData.newsletters = [];
                } else if (memberData.subscribed === true && !existingNewsletters.find(n => n.get('status') === 'active')) {
                    const browseOptions = _.pick(options, 'transacting');
                    memberData.newsletters = await this.getSubscribeOnSignupNewsletters(browseOptions);
                }
            }

            // only ever populated with active newsletters - never archived ones
            if (memberData.newsletters) {
                const archivedNewsletters = existingNewsletters.filter(n => n.get('status') === 'archived').map(n => n.id);
                const existingNewsletterIds = existingNewsletters
                    .filter(newsletter => newsletter.attributes.status !== 'archived')
                    .map(newsletter => newsletter.id);
                const incomingNewsletterIds = memberData.newsletters.map(newsletter => newsletter.id);
                // make sure newslettersToAdd does not contain archived newsletters (since that creates false events)
                newslettersToAdd = _.differenceWith(_.differenceWith(incomingNewsletterIds, existingNewsletterIds), archivedNewsletters);
                newslettersToRemove = _.differenceWith(existingNewsletterIds, incomingNewsletterIds);
            }

            // need to maintain archived newsletters; these are not exposed by the members api
            const archivedNewsletters = existingNewsletters.filter(n => n.attributes.status === 'archived');

            if (archivedNewsletters.length > 0) {
                // if (!memberData.newsletters) {
                //     memberData.newsletters = [];
                // }
                archivedNewsletters.forEach(n => memberData.newsletters.push(n));
            }
        }

        const member = await this._Member.edit({
            ...memberData,
            ...memberStatusData
        }, {...options, withRelated});

        for (const productToAdd of productsToAdd) {
            await this._MemberProductEvent.add({
                member_id: member.id,
                product_id: productToAdd,
                action: 'added'
            }, options);
        }

        for (const productToRemove of productsToRemove) {
            await this._MemberProductEvent.add({
                member_id: member.id,
                product_id: productToRemove,
                action: 'removed'
            }, options);
        }

        // Add subscribe events for all (un)subscribed newsletters
        const context = options && options.context || {};
        const source = this._resolveContextSource(context);

        for (const newsletterToAdd of newslettersToAdd) {
            await this._MemberSubscribeEvent.add({
                member_id: member.id,
                newsletter_id: newsletterToAdd,
                subscribed: true,
                source
            }, sharedOptions);
        }

        for (const newsletterToRemove of newslettersToRemove) {
            await this._MemberSubscribeEvent.add({
                member_id: member.id,
                newsletter_id: newsletterToRemove,
                subscribed: false,
                source
            }, sharedOptions);
        }

        if (newslettersToAdd.length > 0 || newslettersToRemove.length > 0) {
            this.dispatchEvent(MemberSubscribeEvent.create({
                memberId: member.id,
                source: source
            }, member.updated_at), sharedOptions);
        }

        if (member.attributes.email !== member._previousAttributes.email) {
            await this._MemberEmailChangeEvent.add({
                member_id: member.id,
                from_email: member._previousAttributes.email,
                to_email: member.get('email')
            }, sharedOptions);
        }

        if (member.attributes.status !== member._previousAttributes.status) {
            await this._MemberStatusEvent.add({
                member_id: member.id,
                from_status: member._previousAttributes.status,
                to_status: member.get('status')
            }, sharedOptions);
        }

        if (this._stripeAPIService.configured && member._changed.email) {
            await member.related('stripeCustomers').fetch();
            const customers = member.related('stripeCustomers');
            for (const customer of customers.models) {
                await this._stripeAPIService.updateCustomerEmail(
                    customer.get('customer_id'),
                    member.get('email')
                );
            }
        }

        return member;
    }

    async list(options) {
        return this._Member.findPage(options);
    }

    async destroy(data, options) {
        const member = await this._Member.findOne(data, options);

        if (!member) {
            // throw error?
            return;
        }

        if (this._stripeAPIService.configured && options.cancelStripeSubscriptions) {
            await member.related('stripeSubscriptions').fetch();
            const subscriptions = member.related('stripeSubscriptions');
            for (const subscription of subscriptions.models) {
                if (subscription.get('status') !== 'canceled') {
                    const updatedSubscription = await this._stripeAPIService.cancelSubscription(
                        subscription.get('subscription_id')
                    );

                    await this._StripeCustomerSubscription.upsert({
                        status: updatedSubscription.status,
                        mrr: 0
                    }, {
                        subscription_id: updatedSubscription.id
                    });

                    await this._MemberPaidSubscriptionEvent.add({
                        member_id: member.id,
                        source: 'stripe',
                        subscription_id: subscription.id,
                        from_plan: subscription.get('plan_id'),
                        to_plan: null,
                        currency: subscription.get('plan_currency'),
                        mrr_delta: -1 * subscription.get('mrr')
                    }, options);
                }
            }
        }

        return this._Member.destroy({
            id: data.id
        }, options);
    }

    async bulkDestroy(options) {
        const {all, filter, search} = options;

        if (!filter && !search && (!all || all !== true)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.bulkActionRequiresFilter, {action: 'bulk delete'})
            });
        }

        const filterOptions = _.pick(options, ['transacting', 'context']);

        if (all !== true) {
            // Include mongoTransformer to apply subscribed:{true|false} => newsletter relation mapping
            Object.assign(filterOptions, _.pick(options, ['filter', 'search', 'mongoTransformer']));
        }

        const memberRows = await this._Member.getFilteredCollectionQuery(filterOptions)
            .select('members.id')
            .distinct();

        const memberIds = memberRows.map(row => row.id);

        const bulkDestroyResult = await this._Member.bulkDestroy(memberIds);

        bulkDestroyResult.unsuccessfulIds = bulkDestroyResult.unsuccessfulData;

        delete bulkDestroyResult.unsuccessfulData;

        return bulkDestroyResult;
    }

    async bulkEdit(data, options) {
        const {all, filter, search} = options;

        if (!['unsubscribe', 'addLabel', 'removeLabel'].includes(data.action)) {
            throw new errors.IncorrectUsageError({
                message: 'Unsupported bulk action'
            });
        }

        if (!filter && !search && (!all || all !== true)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.bulkActionRequiresFilter, {action: 'bulk edit'})
            });
        }

        const filterOptions = _.pick(options, ['transacting', 'context']);

        if (all !== true) {
            // Include mongoTransformer to apply subscribed:{true|false} => newsletter relation mapping
            Object.assign(filterOptions, _.pick(options, ['filter', 'search', 'mongoTransformer']));
        }
        const memberRows = await this._Member.getFilteredCollectionQuery(filterOptions)
            .select('members.id')
            .distinct();

        const memberIds = memberRows.map(row => row.id);

        if (data.action === 'unsubscribe') {
            const hasNewsletterSelected = (Object.prototype.hasOwnProperty.call(data, 'newsletter') && data.newsletter !== null);
            if (hasNewsletterSelected) {
                const membersArr = memberIds.map(i => `'${i}'`).join(',');
                const unsubscribeRows = await this._MemberNewsletter.getFilteredCollectionQuery({
                    filter: `newsletter_id:'${data.newsletter}'+member_id:[${membersArr}]`
                });
                const toUnsubscribe = unsubscribeRows.map(row => row.id);

                return await this._MemberNewsletter.bulkDestroy(toUnsubscribe);
            }
            if (!hasNewsletterSelected) {
                return await this._Member.bulkDestroy(memberIds, 'members_newsletters', {column: 'member_id'});
            }
        }
        if (data.action === 'removeLabel') {
            const membersLabelsRows = await this._Member.getLabelRelations({
                labelId: data.meta.label.id,
                memberIds
            });

            const membersLabelsIds = membersLabelsRows.map(row => row.id);

            return this._Member.bulkDestroy(membersLabelsIds, 'members_labels');
        }

        if (data.action === 'addLabel') {
            const relations = memberIds.map((id) => {
                return {
                    member_id: id,
                    label_id: data.meta.label.id,
                    id: ObjectId().toHexString()
                };
            });

            return this._Member.bulkAdd(relations, 'members_labels');
        }
    }

    async upsertCustomer(data) {
        return await this._StripeCustomer.upsert({
            customer_id: data.customer_id,
            member_id: data.member_id,
            name: data.name,
            email: data.email
        });
    }

    async linkStripeCustomer(data, options) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'link Stripe Customer'})});
        }
        const customer = await this._stripeAPIService.getCustomer(data.customer_id);

        if (!customer) {
            return;
        }

        // Add instead of upsert ensures that we do not link existing customer
        await this._StripeCustomer.add({
            customer_id: data.customer_id,
            member_id: data.member_id,
            name: customer.name,
            email: customer.email
        }, options);

        for (const subscription of customer.subscriptions.data) {
            await this.linkSubscription({
                id: data.member_id,
                subscription
            }, options);
        }
    }

    async getCustomerIdByEmail(email) {
        return this._stripeAPIService.getCustomerIdByEmail(email);
    }

    async getSubscriptionByStripeID(id, options) {
        const subscription = await this._StripeCustomerSubscription.findOne({
            subscription_id: id
        }, options);

        return subscription;
    }

    /**
     *
     * @param {Object} data
     * @param {String} data.id - member ID
     * @param {Object} data.subscription
     * @param {String} data.offerId
     * @param {import('@tryghost/member-attribution/lib/Attribution').AttributionResource} [data.attribution]
     * @param {*} options
     * @returns
     */
    async linkSubscription(data, options = {}) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'link Stripe Subscription'})});
        }

        if (!options.transacting) {
            return this._Member.transaction((transacting) => {
                return this.linkSubscription(data, {
                    ...options,
                    transacting
                });
            });
        }

        if (!options.batch_id) {
            options.batch_id = ObjectId().toHexString();
        }

        const memberModel = await this._Member.findOne({
            id: data.id
        }, {...options, forUpdate: true});

        const memberStripeCustomerModel = await memberModel.related('stripeCustomers').query({
            where: {
                customer_id: data.subscription.customer
            }
        }).fetchOne(options);

        if (!memberStripeCustomerModel) {
            // Maybe just link the customer?
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound)});
        }

        const stripeSubscriptionData = await this._stripeAPIService.getSubscription(data.subscription.id);
        let paymentMethodId;
        if (!stripeSubscriptionData.default_payment_method) {
            paymentMethodId = null;
        } else if (typeof stripeSubscriptionData.default_payment_method === 'string') {
            paymentMethodId = stripeSubscriptionData.default_payment_method;
        } else {
            paymentMethodId = stripeSubscriptionData.default_payment_method.id;
        }
        const stripePaymentMethodData = paymentMethodId ? await this._stripeAPIService.getCardPaymentMethod(paymentMethodId) : null;

        const stripeCustomerSubscriptionModel = await this.getSubscriptionByStripeID(stripeSubscriptionData.id, {...options, forUpdate: true});

        const subscriptionPriceData = _.get(stripeSubscriptionData, 'items.data[0].price');
        let ghostProduct;
        try {
            ghostProduct = await this._productRepository.get({stripe_product_id: subscriptionPriceData.product}, options);
            // Use first Ghost product as default product in case of missing link
            if (!ghostProduct) {
                ghostProduct = await this._productRepository.getDefaultProduct(options);
            }

            // Link Stripe Product & Price to Ghost Product
            if (ghostProduct) {
                await this._productRepository.update({
                    id: ghostProduct.get('id'),
                    name: ghostProduct.get('name'),
                    stripe_prices: [
                        {
                            stripe_price_id: subscriptionPriceData.id,
                            stripe_product_id: subscriptionPriceData.product,
                            active: subscriptionPriceData.active,
                            nickname: subscriptionPriceData.nickname,
                            currency: subscriptionPriceData.currency,
                            amount: subscriptionPriceData.unit_amount,
                            type: subscriptionPriceData.type,
                            interval: (subscriptionPriceData.recurring && subscriptionPriceData.recurring.interval) || null
                        }
                    ]
                }, options);
            } else {
                // Log error if no Ghost products found
                logging.error(`There was an error linking subscription - ${stripeSubscriptionData.id}, no Products exist.`);
            }
        } catch (e) {
            logging.error(`Failed to handle prices and product for - ${stripeSubscriptionData.id}.`);
            logging.error(e);
        }

        let stripeCouponId = stripeSubscriptionData.discount?.coupon?.id;

        // For trial offers, offer id is passed from metadata as there is no stripe coupon
        let offerId = data.offerId || null;

        if (stripeCouponId && !offerId && ghostProduct) {
            const coupon = stripeSubscriptionData.discount.coupon;
            const cadence = _.get(subscriptionPriceData, 'recurring.interval');
            const tier = {id: ghostProduct.get('id'), name: ghostProduct.get('name')};

            try {
                const offer = await this._offersAPI.ensureOfferForStripeCoupon(
                    coupon,
                    cadence,
                    tier,
                    options
                );
                offerId = offer.id;
            } catch (e) {
                if (e.code === 'INVALID_YEARLY_DURATION') {
                    // During migrations, some Stripe coupons from other platforms may not be compatible with Ghost offers.
                    // For example, a `yearly` coupon set to `repeating` (Ghost only accepts `once` or `forever` for `yearly` coupons).
                    //
                    // In this case, we skip creating the offer, but still create the paid member
                    logging.error(`Failed to create offer for Stripe coupon - ${stripeCouponId}`);
                    logging.error(e);
                } else {
                    throw e;
                }
            }
        }

        const subscriptionData = {
            customer_id: stripeSubscriptionData.customer,
            subscription_id: stripeSubscriptionData.id,
            status: stripeSubscriptionData.status,
            cancel_at_period_end: stripeSubscriptionData.cancel_at_period_end,
            cancellation_reason: this.getCancellationReason(stripeSubscriptionData),
            current_period_end: new Date(stripeSubscriptionData.current_period_end * 1000),
            start_date: new Date(stripeSubscriptionData.start_date * 1000),
            default_payment_card_last4: stripePaymentMethodData && stripePaymentMethodData.card && stripePaymentMethodData.card.last4 || null,
            stripe_price_id: subscriptionPriceData.id,
            plan_id: subscriptionPriceData.id,
            // trial start and end are returned as Stripe timestamps and need coversion
            trial_start_at: stripeSubscriptionData.trial_start ? new Date(stripeSubscriptionData.trial_start * 1000) : null,
            trial_end_at: stripeSubscriptionData.trial_end ? new Date(stripeSubscriptionData.trial_end * 1000) : null,
            // NOTE: Defaulting to interval as migration to nullable field
            // turned out to be much bigger problem.
            // Ideally, would need nickname field to be nullable on the DB level
            // condition can be simplified once this is done
            plan_nickname: subscriptionPriceData.nickname || _.get(subscriptionPriceData, 'recurring.interval'),
            plan_interval: _.get(subscriptionPriceData, 'recurring.interval', ''),
            plan_amount: subscriptionPriceData.unit_amount,
            plan_currency: subscriptionPriceData.currency,
            mrr: this.getMRR({
                interval: _.get(subscriptionPriceData, 'recurring.interval', ''),
                amount: subscriptionPriceData.unit_amount,
                status: stripeSubscriptionData.status,
                canceled: stripeSubscriptionData.cancel_at_period_end,
                discount: stripeSubscriptionData.discount
            }),
            offer_id: offerId,
            discount_start: stripeSubscriptionData.discount?.start ? new Date(stripeSubscriptionData.discount.start * 1000) : null,
            discount_end: stripeSubscriptionData.discount?.end ? new Date(stripeSubscriptionData.discount.end * 1000) : null
        };

        const getStatus = (modelToCheck) => {
            const status = modelToCheck.get('status');
            const canceled = modelToCheck.get('cancel_at_period_end');

            if (status === 'canceled') {
                return 'expired';
            }

            if (canceled) {
                return 'canceled';
            }

            if (this.isActiveSubscriptionStatus(status)) {
                return 'active';
            }

            return 'inactive';
        };
        let eventData = {};

        const stripeCustomerSubscriptionModelShouldBeDeleted = stripeSubscriptionData.metadata && !!stripeSubscriptionData.metadata.ghost_migrated_to && stripeSubscriptionData.status === 'canceled';
        if (stripeCustomerSubscriptionModelShouldBeDeleted) {
            logging.warn(`Subscription ${subscriptionData.subscription_id} is marked for deletion, skipping linking.`);

            if (stripeCustomerSubscriptionModel) {
                // Delete all paid subscription events manually for this subscription
                // This is the only related event without a foreign key constraint
                await this._MemberPaidSubscriptionEvent.query().where('subscription_id', stripeCustomerSubscriptionModel.id).delete().transacting(options.transacting);

                // Delete the subscription in the database because we don't want to show it in the UI or in our data calculations
                await stripeCustomerSubscriptionModel.destroy(options);
            }
        } else if (stripeCustomerSubscriptionModel) {
            // CASE: Offer is already mapped against sub, don't overwrite it with NULL
            // Needed for trial offers, which don't have a stripe coupon/discount attached to sub
            if (!subscriptionData.offer_id) {
                delete subscriptionData.offer_id;
            }
            const updatedStripeCustomerSubscriptionModel = await this._StripeCustomerSubscription.edit(subscriptionData, {
                ...options,
                id: stripeCustomerSubscriptionModel.id
            });

            // CASE: Existing free member subscribes to a paid tier with an offer
            // Stripe doesn't send the discount/offer info in the subscription.created event
            // So we need to record the offer redemption event upon updating the subscription here
            if (stripeCustomerSubscriptionModel.get('offer_id') === null && subscriptionData.offer_id) {
                const offerRedemptionEvent = OfferRedemptionEvent.create({
                    memberId: memberModel.id,
                    offerId: subscriptionData.offer_id,
                    subscriptionId: updatedStripeCustomerSubscriptionModel.id
                }, updatedStripeCustomerSubscriptionModel.get('created_at'));
                this.dispatchEvent(offerRedemptionEvent, options);
            }

            if (stripeCustomerSubscriptionModel.get('mrr') !== updatedStripeCustomerSubscriptionModel.get('mrr') || stripeCustomerSubscriptionModel.get('plan_id') !== updatedStripeCustomerSubscriptionModel.get('plan_id') || stripeCustomerSubscriptionModel.get('status') !== updatedStripeCustomerSubscriptionModel.get('status') || stripeCustomerSubscriptionModel.get('cancel_at_period_end') !== updatedStripeCustomerSubscriptionModel.get('cancel_at_period_end')) {
                const originalMrrDelta = stripeCustomerSubscriptionModel.get('mrr');
                const updatedMrrDelta = updatedStripeCustomerSubscriptionModel.get('mrr');

                const getEventType = (originalStatus, updatedStatus) => {
                    if (originalStatus === updatedStatus) {
                        return 'updated';
                    }

                    if (originalStatus === 'canceled' && updatedStatus === 'active') {
                        return 'reactivated';
                    }

                    return updatedStatus;
                };

                const originalStatus = getStatus(stripeCustomerSubscriptionModel);
                const updatedStatus = getStatus(updatedStripeCustomerSubscriptionModel);
                const eventType = getEventType(originalStatus, updatedStatus);

                const mrrDelta = updatedMrrDelta - originalMrrDelta;

                await this._MemberPaidSubscriptionEvent.add({
                    member_id: memberModel.id,
                    source: 'stripe',
                    type: eventType,
                    subscription_id: updatedStripeCustomerSubscriptionModel.id,
                    from_plan: stripeCustomerSubscriptionModel.get('plan_id'),
                    to_plan: updatedStripeCustomerSubscriptionModel.get('status') === 'canceled' ? null : updatedStripeCustomerSubscriptionModel.get('plan_id'),
                    currency: subscriptionPriceData.currency,
                    mrr_delta: mrrDelta
                }, options);

                // Did we activate this subscription?
                // This happens when an incomplete subscription is completed
                // This always happens during the 3D secure flow, so it is important to catch
                if (originalStatus !== 'active' && updatedStatus === 'active') {
                    const context = options?.context || {};
                    const source = this._resolveContextSource(context);

                    const subscriptionActivatedEvent = SubscriptionActivatedEvent.create({
                        source,
                        tierId: ghostProduct?.get('id'),
                        memberId: memberModel.id,
                        subscriptionId: updatedStripeCustomerSubscriptionModel.get('id'),
                        offerId: offerId,
                        batchId: options.batch_id
                    });
                    this.dispatchEvent(subscriptionActivatedEvent, options);
                }

                // Dispatch cancellation event, i.e. send paid cancellation staff notification, if:
                // 1. The subscription has been set to cancel at period end, by the member in Portal, status 'canceled'
                // 2. The subscription has been immediately canceled (e.g. due to multiple failed payments), status 'expired'
                if (this.isActiveSubscriptionStatus(originalStatus) && (updatedStatus === 'canceled' || updatedStatus === 'expired')) {
                    const context = options?.context || {};
                    const source = this._resolveContextSource(context);
                    const cancelNow = updatedStatus === 'expired';
                    const canceledAt = new Date(stripeSubscriptionData.canceled_at * 1000);
                    const expiryAt = cancelNow ? canceledAt : updatedStripeCustomerSubscriptionModel.get('current_period_end');

                    const subscriptionCancelledEvent = SubscriptionCancelledEvent.create({
                        source,
                        tierId: ghostProduct?.get('id'),
                        memberId: memberModel.id,
                        subscriptionId: updatedStripeCustomerSubscriptionModel.get('id'),
                        cancelNow,
                        canceledAt,
                        expiryAt
                    });

                    this.dispatchEvent(subscriptionCancelledEvent, options);
                }
            }
        } else {
            eventData.created_at = new Date(stripeSubscriptionData.start_date * 1000);
            const newStripeCustomerSubscriptionModel = await this._StripeCustomerSubscription.add(subscriptionData, options);
            await this._MemberPaidSubscriptionEvent.add({
                member_id: memberModel.id,
                subscription_id: newStripeCustomerSubscriptionModel.id,
                type: 'created',
                source: 'stripe',
                from_plan: null,
                to_plan: subscriptionPriceData.id,
                currency: subscriptionPriceData.currency,
                mrr_delta: newStripeCustomerSubscriptionModel.get('mrr'),
                ...eventData
            }, options);

            const context = options?.context || {};
            const source = this._resolveContextSource(context);
            const attribution = {
                id: data.attribution?.id ?? stripeSubscriptionData.metadata?.attribution_id ?? null,
                url: data.attribution?.url ?? stripeSubscriptionData.metadata?.attribution_url ?? null,
                type: data.attribution?.type ?? stripeSubscriptionData.metadata?.attribution_type ?? null,
                referrerSource: data.attribution?.referrerSource ?? stripeSubscriptionData.metadata?.referrer_source ?? null,
                referrerMedium: data.attribution?.referrerMedium ?? stripeSubscriptionData.metadata?.referrer_medium ?? null,
                referrerUrl: data.attribution?.referrerUrl ?? stripeSubscriptionData.metadata?.referrer_url ?? null,
                utmSource: data.attribution?.utmSource ?? stripeSubscriptionData.metadata?.utm_source ?? null,
                utmMedium: data.attribution?.utmMedium ?? stripeSubscriptionData.metadata?.utm_medium ?? null,
                utmCampaign: data.attribution?.utmCampaign ?? stripeSubscriptionData.metadata?.utm_campaign ?? null,
                utmTerm: data.attribution?.utmTerm ?? stripeSubscriptionData.metadata?.utm_term ?? null,
                utmContent: data.attribution?.utmContent ?? stripeSubscriptionData.metadata?.utm_content ?? null
            };

            const subscriptionCreatedEvent = SubscriptionCreatedEvent.create({
                source,
                tierId: ghostProduct?.get('id'),
                memberId: memberModel.id,
                subscriptionId: newStripeCustomerSubscriptionModel.get('id'),
                offerId: offerId,
                attribution: attribution,
                batchId: options.batch_id
            });

            this.dispatchEvent(subscriptionCreatedEvent, options);

            if (offerId) {
                const offerRedemptionEvent = OfferRedemptionEvent.create({
                    memberId: memberModel.id,
                    offerId: offerId,
                    subscriptionId: newStripeCustomerSubscriptionModel.get('id')
                });
                this.dispatchEvent(offerRedemptionEvent, options);
            }

            if (getStatus(newStripeCustomerSubscriptionModel) === 'active') {
                const subscriptionActivatedEvent = SubscriptionActivatedEvent.create({
                    source,
                    tierId: ghostProduct?.get('id'),
                    memberId: memberModel.id,
                    subscriptionId: newStripeCustomerSubscriptionModel.get('id'),
                    offerId: offerId,
                    attribution: attribution,
                    batchId: options.batch_id
                });
                this.dispatchEvent(subscriptionActivatedEvent, options);
            }
        }

        let memberProducts = (await memberModel.related('products').fetch(options)).toJSON();
        const oldMemberProducts = memberModel.related('products').toJSON();
        let status = memberProducts.length === 0 ? 'free' : 'comped';
        if (!stripeCustomerSubscriptionModelShouldBeDeleted && this.isActiveSubscriptionStatus(stripeSubscriptionData.status)) {
            if (this.isComplimentarySubscription(stripeSubscriptionData)) {
                status = 'comped';
            } else {
                status = 'paid';
            }

            if (stripeCustomerSubscriptionModel) {
                // We might need to...
                // 1. delete the previous product from the linked member products (in case an existing subscription changed product/price)
                // 2. fix the list of products linked to a member (an existing subscription doesn't have a linked product to this member)

                const subscriptions = await memberModel.related('stripeSubscriptions').fetch(options);

                const previousProduct = await this._productRepository.get({
                    stripe_price_id: stripeCustomerSubscriptionModel.get('stripe_price_id')
                }, options);

                if (previousProduct) {
                    let activeSubscriptionForPreviousProduct = false;

                    for (const subscriptionModel of subscriptions.models) {
                        if (this.isActiveSubscriptionStatus(subscriptionModel.get('status')) && subscriptionModel.id !== stripeCustomerSubscriptionModel.id) {
                            try {
                                const subscriptionProduct = await this._productRepository.get({stripe_price_id: subscriptionModel.get('stripe_price_id')}, options);
                                if (subscriptionProduct && previousProduct && subscriptionProduct.id === previousProduct.id) {
                                    activeSubscriptionForPreviousProduct = true;
                                }

                                if (subscriptionProduct && !memberProducts.find(p => p.id === subscriptionProduct.id)) {
                                    // Due to a bug in the past it is possible that this subscription's product wasn't added to the member products
                                    // So we need to add it again
                                    memberProducts.push(subscriptionProduct.toJSON());
                                }
                            } catch (e) {
                                logging.error(`Failed to attach products to member - ${data.id}`);
                                logging.error(e);
                            }
                        }
                    }

                    if (!activeSubscriptionForPreviousProduct) {
                        // We can safely remove the product from this member because it doesn't have any other remaining active subscription for it
                        memberProducts = memberProducts.filter((product) => {
                            return product.id !== previousProduct.id;
                        });
                    }
                }
            }

            if (ghostProduct) {
                // Note: we add the product here
                // We don't override the products because in an edge case a member can have multiple subscriptions
                // We'll need to keep all the products related to those subscriptions to avoid creating other issues
                memberProducts.push(ghostProduct.toJSON());
            }
        } else {
            const subscriptions = await memberModel.related('stripeSubscriptions').fetch(options);
            let activeSubscriptionForGhostProduct = false;
            for (const subscriptionModel of subscriptions.models) {
                if (this.isActiveSubscriptionStatus(subscriptionModel.get('status'))) {
                    status = 'paid';
                    try {
                        const subscriptionProduct = await this._productRepository.get({stripe_price_id: subscriptionModel.get('stripe_price_id')}, options);
                        if (subscriptionProduct && ghostProduct && subscriptionProduct.id === ghostProduct.id) {
                            activeSubscriptionForGhostProduct = true;
                        }

                        if (subscriptionProduct && !memberProducts.find(p => p.id === subscriptionProduct.id)) {
                            // Due to a bug in the past it is possible that this subscription's product wasn't added to the member products
                            // So we need to add it again
                            memberProducts.push(subscriptionProduct.toJSON());
                        }
                    } catch (e) {
                        logging.error(`Failed to attach products to member - ${data.id}`);
                        logging.error(e);
                    }
                }
            }

            if (!activeSubscriptionForGhostProduct) {
                // We don't have an active subscription for this product anymore, so we can safely unlink it from the member
                memberProducts = memberProducts.filter((product) => {
                    return product.id !== ghostProduct.id;
                });
            }

            if (memberProducts.length === 0) {
                // If all products were removed, set the status back to 'free'
                status = 'free';
            }
        }

        let updatedMember;
        try {
            // Remove duplicate products from the list
            memberProducts = _.uniqBy(memberProducts, function (e) {
                return e.id;
            });
            // Edit member with updated products assoicated
            updatedMember = await this._Member.edit({status: status, products: memberProducts}, {...options, id: data.id});
        } catch (e) {
            logging.error(`Failed to update member - ${data.id} - with related products`);
            logging.error(e);
            updatedMember = await this._Member.edit({status: status}, {...options, id: data.id});
        }

        const newMemberProductIds = memberProducts.map(product => product.id);
        const oldMemberProductIds = oldMemberProducts.map(product => product.id);

        const productsToAdd = _.differenceWith(newMemberProductIds, oldMemberProductIds);
        const productsToRemove = _.differenceWith(oldMemberProductIds, newMemberProductIds);

        for (const productToAdd of productsToAdd) {
            await this._MemberProductEvent.add({
                member_id: memberModel.id,
                product_id: productToAdd,
                action: 'added'
            }, options);
        }

        for (const productToRemove of productsToRemove) {
            await this._MemberProductEvent.add({
                member_id: memberModel.id,
                product_id: productToRemove,
                action: 'removed'
            }, options);
        }

        if (updatedMember.attributes.status !== updatedMember._previousAttributes.status) {
            await this._MemberStatusEvent.add({
                member_id: data.id,
                from_status: updatedMember._previousAttributes.status,
                to_status: updatedMember.get('status'),
                ...eventData
            }, options);

            const context = options?.context || {};
            const source = this._resolveContextSource(context);
            const shouldSendPaidWelcomeEmail = this._labsService.isSet('welcomeEmails') && WELCOME_EMAIL_SOURCES.includes(source);
            let isPaidWelcomeEmailActive = false;
            if (shouldSendPaidWelcomeEmail && this._AutomatedEmail) {
                const paidWelcomeEmail = await this._AutomatedEmail.findOne({slug: MEMBER_WELCOME_EMAIL_SLUGS.paid}, options);
                isPaidWelcomeEmailActive = paidWelcomeEmail && paidWelcomeEmail.get('lexical') && paidWelcomeEmail.get('status') === 'active';
            }
            // Send paid welcome email if:
            // 1. The paid welcome email is active
            // 2. The member status changed to 'paid'
            if (updatedMember.get('status') === 'paid' && isPaidWelcomeEmailActive) {
                await this._Outbox.add({
                    id: ObjectId().toHexString(),
                    event_type: MemberCreatedEvent.name,
                    payload: JSON.stringify({
                        memberId: memberModel.id,
                        uuid: memberModel.get('uuid'),
                        email: memberModel.get('email'),
                        name: memberModel.get('name'),
                        source,
                        timestamp: subscriptionData.start_date || updatedMember.get('updated_at') || new Date(),
                        status: 'paid'
                    })
                }, options);
                this.dispatchEvent(StartOutboxProcessingEvent.create({memberId: memberModel.id}), options);
            }
        }
    }

    getCancellationReason(subscription) {
        // Case: manual cancellation in Portal
        if (subscription.metadata && subscription.metadata.cancellation_reason) {
            return subscription.metadata.cancellation_reason;

        // Case: Automatic cancellation due to several payment failures
        } else if (subscription.cancellation_details && subscription.cancellation_details.reason && subscription.cancellation_details.reason === 'payment_failed') {
            return 'Payment failed';
        }

        return null;
    }

    async getSubscription(data, options) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'get Stripe Subscription'})});
        }

        const member = await this._Member.findOne({
            email: data.email
        });

        const subscription = await member.related('stripeSubscriptions').query({
            where: {
                subscription_id: data.subscription.subscription_id
            }
        }).fetchOne(options);

        if (!subscription) {
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound, {id: data.subscription.subscription_id})});
        }

        return subscription.toJSON();
    }

    async cancelSubscription(data, options) {
        const sharedOptions = {
            transacting: options ? options.transacting : null
        };
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'update Stripe Subscription'})});
        }

        let findQuery = null;
        if (data.id) {
            findQuery = {id: data.id};
        } else if (data.email) {
            findQuery = {email: data.email};
        }

        if (!findQuery) {
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound)});
        }

        const member = await this._Member.findOne(findQuery);

        const subscription = await member.related('stripeSubscriptions').query({
            where: {
                subscription_id: data.subscription.subscription_id
            }
        }).fetchOne(options);

        if (!subscription) {
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound, {id: data.subscription.subscription_id})});
        }

        const updatedSubscription = await this._stripeAPIService.cancelSubscription(data.subscription.subscription_id);

        await this.linkSubscription({
            id: member.id,
            subscription: updatedSubscription
        }, options);

        await this._MemberCancelEvent.add({
            member_id: member.id,
            from_plan: subscription.get('plan_id')
        }, sharedOptions);
    }

    async updateSubscription(data, options) {
        const sharedOptions = {
            transacting: options ? options.transacting : null
        };
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'update Stripe Subscription'})});
        }

        let findQuery = null;
        if (data.id) {
            findQuery = {id: data.id};
        } else if (data.email) {
            findQuery = {email: data.email};
        }

        if (!findQuery) {
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound)});
        }

        const member = await this._Member.findOne(findQuery);

        const subscriptionModel = await member.related('stripeSubscriptions').query({
            where: {
                subscription_id: data.subscription.subscription_id
            }
        }).fetchOne(options);

        if (!subscriptionModel) {
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound, {id: data.subscription.subscription_id})});
        }

        let updatedSubscription;
        if (data.subscription.price) {
            const subscription = await this._stripeAPIService.getSubscription(
                data.subscription.subscription_id
            );

            const subscriptionItem = subscription.items.data[0];

            if (data.subscription.price !== subscription.price) {
                updatedSubscription = await this._stripeAPIService.updateSubscriptionItemPrice(
                    subscription.id,
                    subscriptionItem.id,
                    data.subscription.price
                );
                updatedSubscription = await this._stripeAPIService.removeCouponFromSubscription(subscription.id);

                if (subscriptionModel.get('status') === SUBSCRIPTION_STATUS_TRIALING) {
                    updatedSubscription = await this._stripeAPIService.cancelSubscriptionTrial(subscription.id);
                }
            }
        }

        if (data.subscription.cancel_at_period_end !== undefined) {
            if (data.subscription.cancel_at_period_end) {
                updatedSubscription = await this._stripeAPIService.cancelSubscriptionAtPeriodEnd(
                    data.subscription.subscription_id,
                    data.subscription.cancellationReason
                );

                await this._MemberCancelEvent.add({
                    member_id: member.id,
                    from_plan: subscriptionModel.get('plan_id')
                }, sharedOptions);
            } else {
                updatedSubscription = await this._stripeAPIService.continueSubscriptionAtPeriodEnd(
                    data.subscription.subscription_id
                );
            }
        }

        if (updatedSubscription) {
            await this.linkSubscription({
                id: member.id,
                subscription: updatedSubscription
            }, options);
        }
    }

    /**
     * @param {Object} data
     * @param {string} [data.id] - Member ID
     * @param {string} [data.email] - Member email
     * @param {Object} data.subscription
     * @param {string} data.subscription.subscription_id - Stripe subscription ID
     * @param {string} data.offerId - Offer ID to apply
     * @param {string} data.couponId - Stripe coupon ID for the offer
     * @param {Object} [options]
     */
    async applyOfferToSubscription(data, options = {}) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({
                message: tpl(messages.noStripeConnection, {action: 'apply offer to Subscription'})
            });
        }

        if (!options.transacting) {
            return this._Member.transaction((transacting) => {
                return this.applyOfferToSubscription(data, {
                    ...options,
                    transacting
                });
            });
        }

        // Find member
        let findQuery = null;
        if (data.id) {
            findQuery = {id: data.id};
        } else if (data.email) {
            findQuery = {email: data.email};
        }

        if (!findQuery) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound, {id: 'unknown'})
            });
        }

        const member = await this._Member.findOne(findQuery, options);
        if (!member) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound, {id: data.id || data.email})
            });
        }

        // Fetch subscription with related data
        const subscriptionModel = await member.related('stripeSubscriptions').query({
            where: {
                subscription_id: data.subscription.subscription_id
            }
        }).fetchOne({
            ...options,
            forUpdate: true,
            withRelated: ['stripePrice', 'stripePrice.stripeProduct', 'stripePrice.stripeProduct.product']
        });

        if (!subscriptionModel) {
            throw new errors.NotFoundError({
                message: tpl(messages.subscriptionNotFound, {id: data.subscription.subscription_id})
            });
        }

        // Validate subscription is active
        const subscriptionStatus = subscriptionModel.get('status');
        if (!this.isActiveSubscriptionStatus(subscriptionStatus)) {
            throw new errors.BadRequestError({
                message: tpl(messages.subscriptionNotActive)
            });
        }

        // Check subscription doesn't already have an offer
        if (subscriptionModel.get('offer_id')) {
            throw new errors.BadRequestError({
                message: tpl(messages.subscriptionHasOffer)
            });
        }

        // Check subscription is not in a trial period
        const trialEndAt = subscriptionModel.get('trial_end_at');
        if (trialEndAt && trialEndAt > new Date()) {
            throw new errors.BadRequestError({
                message: tpl(messages.subscriptionInTrial)
            });
        }

        // Get tier and cadence from subscription
        const stripePrice = subscriptionModel.related('stripePrice');
        const stripeProduct = stripePrice.related('stripeProduct');
        const product = stripeProduct.related('product');

        const tierId = product.id;
        const cadence = stripePrice.get('interval');

        // Fetch and validate offer
        const offer = await this._offersAPI.getOffer({id: data.offerId}, options);

        if (!offer) {
            throw new errors.NotFoundError({
                message: tpl(messages.offerNotFound, {id: data.offerId})
            });
        }

        if (offer.status !== 'active') {
            throw new errors.BadRequestError({
                message: tpl(messages.offerNotActive)
            });
        }

        if (offer.type === 'trial') {
            throw new errors.BadRequestError({
                message: tpl(messages.offerIsTrialOffer)
            });
        }

        if (offer.redemption_type === 'signup') {
            throw new errors.BadRequestError({
                message: tpl(messages.offerIsSignupOffer)
            });
        }

        if (offer.tier.id !== tierId) {
            throw new errors.BadRequestError({
                message: tpl(messages.offerTierMismatch)
            });
        }

        if (offer.cadence !== cadence) {
            throw new errors.BadRequestError({
                message: tpl(messages.offerCadenceMismatch)
            });
        }

        // Check not already redeemed on this subscription
        const existingRedemption = await this._OfferRedemption.findOne({
            offer_id: data.offerId,
            subscription_id: subscriptionModel.id
        }, options);

        if (existingRedemption) {
            throw new errors.BadRequestError({
                message: tpl(messages.offerAlreadyRedeemed)
            });
        }

        // Validate coupon was provided (getCouponForOffer returns null for trial offers or if offer has no stripe_coupon_id)
        if (!data.couponId) {
            throw new errors.BadRequestError({
                message: tpl(messages.offerNoCoupon)
            });
        }

        const stripeSubscriptionId = subscriptionModel.get('subscription_id');

        // Apply coupon to Stripe subscription
        const updatedSubscription = await this._stripeAPIService.addCouponToSubscription(
            stripeSubscriptionId,
            data.couponId
        );

        // Sync local state with Stripe
        await this.linkSubscription({
            id: member.id,
            subscription: updatedSubscription,
            offerId: data.offerId
        }, options);
    }

    async createSubscription(data, options) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'create Stripe Subscription'})});
        }
        const member = await this._Member.findOne({
            id: data.id
        }, options);

        let stripeCustomer;

        await member.related('stripeCustomers').fetch(options);

        for (const customer of member.related('stripeCustomers').models) {
            try {
                const fetchedCustomer = await this._stripeAPIService.getCustomer(customer.get('customer_id'));
                stripeCustomer = fetchedCustomer;
            } catch (err) {
                logging.info('Ignoring error for fetching customer for checkout');
            }
        }

        if (!stripeCustomer) {
            stripeCustomer = await this._stripeAPIService.createCustomer({
                email: member.get('email')
            });

            await this._StripeCustomer.add({
                customer_id: stripeCustomer.id,
                member_id: data.id,
                email: stripeCustomer.email,
                name: stripeCustomer.name
            }, options);
        }

        const subscription = await this._stripeAPIService.createSubscription(stripeCustomer.id, data.subscription.stripe_price_id);

        await this.linkSubscription({
            id: member.id,
            subscription
        }, options);
    }

    /**
     *
     * @param {Object} data
     * @param {String} data.id - member ID
     * @param {Object} options
     * @param {Object} [options.transacting]
     */
    async setComplimentarySubscription(data, options = {}) {
        if (!options.transacting) {
            return this._Member.transaction((transacting) => {
                return this.setComplimentarySubscription(data, {
                    ...options,
                    transacting
                });
            });
        }

        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'create Complimentary Subscription'})});
        }
        const member = await this._Member.findOne({
            id: data.id
        }, options);

        const subscriptions = await member.related('stripeSubscriptions').fetch(options);

        const activeSubscriptions = subscriptions.models.filter((subscription) => {
            return this.isActiveSubscriptionStatus(subscription.get('status'));
        });
        const sharedOptions = _.pick(options, ['context', 'transacting']);

        const ghostProductModel = await this._productRepository.getDefaultProduct({
            withRelated: ['stripePrices'],
            ...sharedOptions
        });

        const defaultProduct = ghostProductModel?.toJSON();

        if (!defaultProduct) {
            throw new errors.NotFoundError({
                message: tpl(messages.productNotFound, {id: '"default"'})
            });
        }

        const zeroValuePrices = defaultProduct.stripePrices.filter((price) => {
            return price.amount === 0;
        });

        if (activeSubscriptions.length) {
            for (const subscription of activeSubscriptions) {
                const price = await subscription.related('stripePrice').fetch(options);

                let zeroValuePrice = zeroValuePrices.find((p) => {
                    return p.currency.toLowerCase() === price.get('currency').toLowerCase();
                });

                if (!zeroValuePrice) {
                    const product = (await this._productRepository.update({
                        id: defaultProduct.id,
                        name: defaultProduct.name,
                        description: defaultProduct.description,
                        stripe_prices: [{
                            nickname: 'Complimentary',
                            currency: price.get('currency'),
                            type: 'recurring',
                            interval: 'year',
                            amount: 0
                        }]
                    }, options)).toJSON();
                    zeroValuePrice = product.stripePrices.find((p) => {
                        return p.currency.toLowerCase() === price.get('currency').toLowerCase() && p.amount === 0;
                    });
                    zeroValuePrices.push(zeroValuePrice);
                }

                const stripeSubscription = await this._stripeAPIService.getSubscription(
                    subscription.get('subscription_id')
                );

                const subscriptionItem = stripeSubscription.items.data[0];

                const updatedSubscription = await this._stripeAPIService.updateSubscriptionItemPrice(
                    stripeSubscription.id,
                    subscriptionItem.id,
                    zeroValuePrice.stripe_price_id
                );

                await this.linkSubscription({
                    id: member.id,
                    subscription: updatedSubscription
                }, sharedOptions);
            }
        } else {
            const stripeCustomer = await this._stripeAPIService.createCustomer({
                email: member.get('email')
            });

            await this._StripeCustomer.upsert({
                customer_id: stripeCustomer.id,
                member_id: data.id,
                email: stripeCustomer.email,
                name: stripeCustomer.name
            }, sharedOptions);

            let zeroValuePrice = zeroValuePrices[0];

            if (!zeroValuePrice) {
                const product = (await this._productRepository.update({
                    id: defaultProduct.id,
                    name: defaultProduct.name,
                    description: defaultProduct.description,
                    stripe_prices: [{
                        nickname: 'Complimentary',
                        currency: 'USD',
                        type: 'recurring',
                        interval: 'year',
                        amount: 0
                    }]
                }, sharedOptions)).toJSON();
                zeroValuePrice = product.stripePrices.find((price) => {
                    return price.currency.toLowerCase() === 'usd' && price.amount === 0;
                });
                zeroValuePrices.push(zeroValuePrice);
            }

            const subscription = await this._stripeAPIService.createSubscription(
                stripeCustomer.id,
                zeroValuePrice.stripe_price_id
            );

            await this.linkSubscription({
                id: member.id,
                subscription
            }, sharedOptions);
        }
    }

    /**
     *
     * @param {Object} data
     * @param {String} data.id - member ID
     * @param {Object} options
     * @param {Object} [options.transacting]
     */
    async cancelComplimentarySubscription({id}, options) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'cancel Complimentary Subscription'})});
        }

        const member = await this._Member.findOne({
            id: id
        });

        const subscriptions = await member.related('stripeSubscriptions').fetch();

        for (const subscription of subscriptions.models) {
            if (subscription.get('status') !== 'canceled') {
                try {
                    const updatedSubscription = await this._stripeAPIService.cancelSubscription(
                        subscription.get('subscription_id')
                    );
                    // Only needs to update `status`
                    await this.linkSubscription({
                        id: id,
                        subscription: updatedSubscription
                    }, options);
                } catch (err) {
                    logging.error(`There was an error cancelling subscription ${subscription.get('subscription_id')}`);
                    logging.error(err);
                }
            }
        }
        return true;
    }

    /**
     * @param {string} memberId
     * @param {import('../../commenting').MemberCommenting} commenting
     * @param {string} actionName
     * @param {Object} context
     */
    async saveCommenting(memberId, commenting, actionName, context) {
        return this._Member.edit(
            {commenting},
            {
                id: memberId,
                context,
                actionName
            }
        );
    }
};
