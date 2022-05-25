const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const DomainEvents = require('@tryghost/domain-events');
const {SubscriptionCreatedEvent, MemberSubscribeEvent} = require('@tryghost/member-events');
const ObjectId = require('bson-objectid');
const {NotFoundError} = require('@tryghost/errors');

const messages = {
    noStripeConnection: 'Cannot {action} without a Stripe Connection',
    moreThanOneProduct: 'A member cannot have more than one Product',
    existingSubscriptions: 'Cannot modify Products for a Member with active Subscriptions',
    memberNotFound: 'Could not find Member {id}',
    subscriptionNotFound: 'Could not find Subscription {id}',
    productNotFound: 'Could not find Product {id}',
    bulkActionRequiresFilter: 'Cannot perform {action} without a filter or all=true',
    tierArchived: 'Cannot use archived Tiers'
};

/**
 * @typedef {object} ITokenService
 * @prop {(token: string) => Promise<import('jsonwebtoken').JwtPayload>} decodeToken
 */

module.exports = class MemberRepository {
    /**
     * @param {object} deps
     * @param {any} deps.Member
     * @param {any} deps.MemberCancelEvent
     * @param {any} deps.MemberSubscribeEvent
     * @param {any} deps.MemberEmailChangeEvent
     * @param {any} deps.MemberPaidSubscriptionEvent
     * @param {any} deps.MemberStatusEvent
     * @param {any} deps.MemberProductEvent
     * @param {any} deps.StripeCustomer
     * @param {any} deps.StripeCustomerSubscription
     * @param {any} deps.OfferRedemption
     * @param {import('../../services/stripe-api')} deps.stripeAPIService
     * @param {any} deps.labsService
     * @param {any} deps.productRepository
     * @param {any} deps.offerRepository
     * @param {ITokenService} deps.tokenService
     * @param {any} deps.newslettersService
     */
    constructor({
        Member,
        MemberCancelEvent,
        MemberSubscribeEvent,
        MemberEmailChangeEvent,
        MemberPaidSubscriptionEvent,
        MemberStatusEvent,
        MemberProductEvent,
        StripeCustomer,
        StripeCustomerSubscription,
        OfferRedemption,
        stripeAPIService,
        labsService,
        productRepository,
        offerRepository,
        tokenService,
        newslettersService
    }) {
        this._Member = Member;
        this._MemberCancelEvent = MemberCancelEvent;
        this._MemberSubscribeEvent = MemberSubscribeEvent;
        this._MemberEmailChangeEvent = MemberEmailChangeEvent;
        this._MemberPaidSubscriptionEvent = MemberPaidSubscriptionEvent;
        this._MemberStatusEvent = MemberStatusEvent;
        this._MemberProductEvent = MemberProductEvent;
        this._StripeCustomer = StripeCustomer;
        this._StripeCustomerSubscription = StripeCustomerSubscription;
        this._stripeAPIService = stripeAPIService;
        this._productRepository = productRepository;
        this._offerRepository = offerRepository;
        this.tokenService = tokenService;
        this._newslettersService = newslettersService;
        this._labsService = labsService;

        DomainEvents.subscribe(SubscriptionCreatedEvent, async function (event) {
            if (!event.data.offerId) {
                return;
            }

            await OfferRedemption.add({
                member_id: event.data.memberId,
                subscription_id: event.data.subscriptionId,
                offer_id: event.data.offerId
            });
        });
    }

    isActiveSubscriptionStatus(status) {
        return ['active', 'trialing', 'unpaid', 'past_due'].includes(status);
    }

    isComplimentarySubscription(subscription) {
        return subscription.plan && subscription.plan.nickname && subscription.plan.nickname.toLowerCase() === 'complimentary';
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
        return this._Member.findOne(data, options);
    }

    async getByToken(token, options) {
        const data = await this.tokenService.decodeToken(token);

        return this.get({
            email: data.sub
        }, options);
    }

    async create(data, options) {
        if (!options) {
            options = {};
        }

        const {labels} = data;

        if (labels) {
            labels.forEach((label, index) => {
                if (typeof label === 'string') {
                    labels[index] = {name: label};
                }
            });
        }

        const memberData = _.pick(data, ['email', 'name', 'note', 'subscribed', 'geolocation', 'created_at', 'products', 'newsletters']);

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

        // Subscribe member to default newsletters
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

        const member = await this._Member.add({
            ...memberData,
            ...memberStatusData,
            labels
        }, {...options, withRelated});

        for (const product of member.related('products').models) {
            await this._MemberProductEvent.add({
                member_id: member.id,
                product_id: product.id,
                action: 'added'
            }, options);
        }

        const context = options && options.context || {};
        let source;

        if (context.import || context.importer) {
            source = 'import';
        } else if (context.internal) {
            source = 'system';
        } else if (context.user) {
            source = 'admin';
        } else if (context.api_key) {
            source = 'api';
        } else {
            source = 'member';
        }

        const eventData = _.pick(data, ['created_at']);

        if (!eventData.created_at) {
            eventData.created_at = member.get('created_at');
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
            DomainEvents.dispatch(MemberSubscribeEvent.create({
                memberId: member.id,
                source: source
            }, eventData.created_at));
        }

        return member;
    }

    async getSubscribeOnSignupNewsletters(browseOptions) {
        // By default subscribe to all active auto opt-in newsletters with members visibility
        //TODO: Will mostly need to be updated later for paid-only newsletters
        browseOptions.filter = 'status:active+subscribe_on_signup:true+visibility:members';
        const newsletters = await this._newslettersService.browse(browseOptions);
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
            'last_seen_at'
        ]);

        // Determine if we need to fetch the initial member with relations
        const needsProducts = this._stripeAPIService.configured && data.products;
        const needsNewsletters = memberData.newsletters || typeof memberData.subscribed === 'boolean';

        // Build list for withRelated
        const requiredRelations = [];
        if (needsProducts) {
            requiredRelations.push('products');
        }
        if (needsNewsletters) {
            requiredRelations.push('newsletters');
        }

        // Fetch the member with relations if required
        let initialMember = null;
        if (requiredRelations.length > 0) {
            initialMember = await this._Member.findOne({
                id: options.id
            }, {...sharedOptions, withRelated: requiredRelations});

            // Make sure we throw the right error if it doesn't exist
            if (!initialMember) {
                throw new NotFoundError({message: tpl(messages.memberNotFound, {id: options.id})});
            }
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
                const exisitingSubscriptions = await initialMember.related('stripeSubscriptions').fetch(sharedOptions);
                const existingActiveSubscriptions = exisitingSubscriptions.filter((subscription) => {
                    return this.isActiveSubscriptionStatus(subscription.get('status'));
                });

                if (existingActiveSubscriptions.length) {
                    throw new errors.BadRequestError({message: tpl(messages.existingSubscriptions)});
                }
            }

            // CASE: We are removing all products from a member & there were no active subscriptions - the member is "free"
            if (incomingProductIds.length === 0) {
                memberStatusData.status = 'free';
            } else {
                // CASE: We are changing products & there were not active stripe subscriptions - the member is "comped"
                if (productsToModify.length !== 0) {
                    memberStatusData.status = 'comped';
                } else {
                    // CASE: We are not changing any products - leave the status alone
                }
            }
        }

        for (const productId of productsToAdd) {
            const product = await this._productRepository.get({id: productId}, sharedOptions);
            if (product.get('active') !== true) {
                throw new errors.BadRequestError({message: tpl(messages.tierArchived)});
            }
        }

        // Keep track of the newsletters that were added and removed of a member so we can generate the corresponding events
        let newslettersToAdd = [];
        let newslettersToRemove = [];

        if (needsNewsletters) {
            const existingNewsletters = initialMember.related('newsletters').models;

            // This maps the old susbcribed property to the new newsletters field
            if (!memberData.newsletters) {
                if (memberData.subscribed === false) {
                    memberData.newsletters = [];
                } else if (memberData.subscribed === true && !existingNewsletters.find(n => n.status === 'active')) {
                    const browseOptions = _.pick(options, 'transacting');
                    memberData.newsletters = await this.getSubscribeOnSignupNewsletters(browseOptions);
                }
            }

            if (memberData.newsletters) {
                const existingNewsletterIds = existingNewsletters.map(newsletter => newsletter.id);
                const incomingNewsletterIds = memberData.newsletters.map(newsletter => newsletter.id);

                newslettersToAdd = _.differenceWith(incomingNewsletterIds, existingNewsletterIds);
                newslettersToRemove = _.differenceWith(existingNewsletterIds, incomingNewsletterIds);
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
        let source;
        if (context.internal) {
            source = 'system';
        } else if (context.user) {
            source = 'admin';
        } else if (context.api_key) {
            source = 'api';
        } else {
            source = 'member';
        }

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
            DomainEvents.dispatch(MemberSubscribeEvent.create({
                memberId: member.id,
                source: source
            }, member.updated_at));
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
            return await this._Member.bulkDestroy(memberIds, 'members_newsletters', {column: 'member_id'});
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

    async getSubscriptionByStripeID(id, options) {
        const subscription = await this._StripeCustomerSubscription.findOne({
            subscription_id: id
        }, options);

        return subscription;
    }

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
        const member = await this._Member.findOne({
            id: data.id
        }, {...options, forUpdate: true});

        const customer = await member.related('stripeCustomers').query({
            where: {
                customer_id: data.subscription.customer
            }
        }).fetchOne(options);

        if (!customer) {
            // Maybe just link the customer?
            throw new errors.NotFoundError({message: tpl(messages.subscriptionNotFound)});
        }

        const subscription = await this._stripeAPIService.getSubscription(data.subscription.id);
        let paymentMethodId;
        if (!subscription.default_payment_method) {
            paymentMethodId = null;
        } else if (typeof subscription.default_payment_method === 'string') {
            paymentMethodId = subscription.default_payment_method;
        } else {
            paymentMethodId = subscription.default_payment_method.id;
        }
        const paymentMethod = paymentMethodId ? await this._stripeAPIService.getCardPaymentMethod(paymentMethodId) : null;

        const model = await this.getSubscriptionByStripeID(subscription.id, {...options, forUpdate: true});

        const subscriptionPriceData = _.get(subscription, 'items.data[0].price');
        let ghostProduct;
        try {
            ghostProduct = await this._productRepository.get({stripe_product_id: subscriptionPriceData.product}, {...options, forUpdate: true});
            // Use first Ghost product as default product in case of missing link
            if (!ghostProduct) {
                let {data: pageData} = await this._productRepository.list({
                    limit: 1,
                    filter: 'type:paid',
                    ...options,
                    forUpdate: true
                });
                ghostProduct = (pageData && pageData[0]) || null;
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
                logging.error(`There was an error linking subscription - ${subscription.id}, no Products exist.`);
            }
        } catch (e) {
            logging.error(`Failed to handle prices and product for - ${subscription.id}.`);
            logging.error(e);
        }

        let stripeCouponId = subscription.discount && subscription.discount.coupon ? subscription.discount.coupon.id : null;
        let offerId = null;

        if (stripeCouponId) {
            // Get the offer from our database
            const offer = await this._offerRepository.getByStripeCouponId(stripeCouponId, {transacting: options.transacting});
            if (offer) {
                offerId = offer.id;
            } else {
                logging.error(`Received an unknown stripe coupon id (${stripeCouponId}) for subscription - ${subscription.id}.`);
            }
        }

        const subscriptionData = {
            customer_id: subscription.customer,
            subscription_id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancellation_reason: subscription.metadata && subscription.metadata.cancellation_reason || null,
            current_period_end: new Date(subscription.current_period_end * 1000),
            start_date: new Date(subscription.start_date * 1000),
            default_payment_card_last4: paymentMethod && paymentMethod.card && paymentMethod.card.last4 || null,
            stripe_price_id: subscriptionPriceData.id,
            plan_id: subscriptionPriceData.id,
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
                status: subscription.status,
                canceled: subscription.cancel_at_period_end,
                discount: subscription.discount
            }),
            offer_id: offerId
        };

        let eventData = {};
        if (model) {
            const updated = await this._StripeCustomerSubscription.edit(subscriptionData, {
                ...options,
                id: model.id
            });

            if (model.get('mrr') !== updated.get('mrr') || model.get('plan_id') !== updated.get('plan_id') || model.get('status') !== updated.get('status') || model.get('cancel_at_period_end') !== updated.get('cancel_at_period_end')) {
                const originalMrrDelta = model.get('mrr');
                const updatedMrrDelta = updated.get('mrr');

                const getStatus = (model) => {
                    const status = model.get('status');
                    const canceled = model.get('cancel_at_period_end');

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

                const getEventName = (originalStatus, updatedStatus) => {
                    if (originalStatus === updatedStatus) {
                        return 'updated';
                    }

                    if (originalStatus === 'canceled' && updatedStatus === 'active') {
                        return 'reactivated';
                    }

                    return updatedStatus;
                };

                const originalStatus = getStatus(model);
                const updatedStatus = getStatus(updated);

                const mrrDelta = updatedMrrDelta - originalMrrDelta;
                await this._MemberPaidSubscriptionEvent.add({
                    member_id: member.id,
                    source: 'stripe',
                    type: getEventName(originalStatus, updatedStatus),
                    subscription_id: updated.id,
                    from_plan: model.get('plan_id'),
                    to_plan: updated.get('status') === 'canceled' ? null : updated.get('plan_id'),
                    currency: subscriptionPriceData.currency,
                    mrr_delta: mrrDelta
                }, options);
            }
        } else {
            eventData.created_at = new Date(subscription.start_date * 1000);
            const model = await this._StripeCustomerSubscription.add(subscriptionData, options);
            await this._MemberPaidSubscriptionEvent.add({
                member_id: member.id,
                subscription_id: model.id,
                type: 'created',
                source: 'stripe',
                from_plan: null,
                to_plan: subscriptionPriceData.id,
                currency: subscriptionPriceData.currency,
                mrr_delta: model.get('mrr'),
                ...eventData
            }, options);
        }

        let memberProducts = (await member.related('products').fetch(options)).toJSON();
        const oldMemberProducts = member.related('products').toJSON();
        let status = memberProducts.length === 0 ? 'free' : 'comped';
        if (this.isActiveSubscriptionStatus(subscription.status)) {
            if (this.isComplimentarySubscription(subscription)) {
                status = 'comped';
            } else {
                status = 'paid';
            }
            // This is an active subscription! Add the product
            if (ghostProduct) {
                memberProducts.push(ghostProduct.toJSON());
            }
            if (model) {
                if (model.get('stripe_price_id') !== subscriptionData.stripe_price_id) {
                    // The subscription has changed plan - we may need to update the products

                    const subscriptions = await member.related('stripeSubscriptions').fetch(options);
                    const changedProduct = await this._productRepository.get({
                        stripe_price_id: model.get('stripe_price_id')
                    }, options);

                    let activeSubscriptionForChangedProduct = false;

                    for (const subscription of subscriptions.models) {
                        if (this.isActiveSubscriptionStatus(subscription.get('status'))) {
                            try {
                                const subscriptionProduct = await this._productRepository.get({stripe_price_id: subscription.get('stripe_price_id')}, options);
                                if (subscriptionProduct && changedProduct && subscriptionProduct.id === changedProduct.id) {
                                    activeSubscriptionForChangedProduct = true;
                                }
                            } catch (e) {
                                logging.error(`Failed to attach products to member - ${data.id}`);
                                logging.error(e);
                            }
                        }
                    }

                    if (!activeSubscriptionForChangedProduct) {
                        memberProducts = memberProducts.filter((product) => {
                            return product.id !== changedProduct.id;
                        });
                    }
                }
            }
        } else {
            const subscriptions = await member.related('stripeSubscriptions').fetch(options);
            let activeSubscriptionForGhostProduct = false;
            for (const subscription of subscriptions.models) {
                if (this.isActiveSubscriptionStatus(subscription.get('status'))) {
                    status = 'paid';
                    try {
                        const subscriptionProduct = await this._productRepository.get({stripe_price_id: subscription.get('stripe_price_id')}, options);
                        if (subscriptionProduct && ghostProduct && subscriptionProduct.id === ghostProduct.id) {
                            activeSubscriptionForGhostProduct = true;
                        }
                    } catch (e) {
                        logging.error(`Failed to attach products to member - ${data.id}`);
                        logging.error(e);
                    }
                }
            }

            if (!activeSubscriptionForGhostProduct) {
                memberProducts = memberProducts.filter((product) => {
                    return product.id !== ghostProduct.id;
                });
            }

            if (memberProducts.length === 0) {
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

        if (updatedMember.attributes.status !== updatedMember._previousAttributes.status) {
            await this._MemberStatusEvent.add({
                member_id: data.id,
                from_status: updatedMember._previousAttributes.status,
                to_status: updatedMember.get('status'),
                ...eventData
            }, options);
        }
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

        const productPage = await this._productRepository.list({
            limit: 1,
            withRelated: ['stripePrices'],
            filter: 'type:paid',
            ...options
        });

        const defaultProduct = productPage && productPage.data && productPage.data[0] && productPage.data[0].toJSON();

        if (!defaultProduct) {
            throw new errors.NotFoundError({message: tpl(messages.productNotFound)});
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
                }, options);
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
            }, options);

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
                }, options)).toJSON();
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
            }, options);
        }
    }

    async cancelComplimentarySubscription(data) {
        if (!this._stripeAPIService.configured) {
            throw new errors.BadRequestError({message: tpl(messages.noStripeConnection, {action: 'cancel Complimentary Subscription'})});
        }

        const member = await this._Member.findOne({
            id: data.id
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
                        id: data.id,
                        subscription: updatedSubscription
                    });
                } catch (err) {
                    logging.error(`There was an error cancelling subscription ${subscription.get('subscription_id')}`);
                    logging.error(err);
                }
            }
        }
        return true;
    }
};

