const _ = require('lodash');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

module.exports = class WebhookController {
    /**
     * @param {object} deps
     * @param {import('./StripeAPI')} deps.api
     * @param {import('./WebhookManager')} deps.webhookManager
     * @param {any} deps.eventRepository
     * @param {any} deps.memberRepository
     * @param {any} deps.productRepository
     * @param {any} deps.sendSignupEmail
     */
    constructor(deps) {
        this.deps = deps;
        this.webhookManager = deps.webhookManager;
        this.api = deps.api;
        this.sendSignupEmail = deps.sendSignupEmail;
        this.handlers = {
            'customer.subscription.deleted': this.subscriptionEvent,
            'customer.subscription.updated': this.subscriptionEvent,
            'customer.subscription.created': this.subscriptionEvent,
            'invoice.payment_succeeded': this.invoiceEvent,
            'checkout.session.completed': this.checkoutSessionEvent
        };
    }

    async handle(req, res) {
        // if (!apiService.configured) {
        //     logging.error(`Stripe not configured, not handling webhook`);
        //     res.writeHead(400);
        //     return res.end();
        // }

        if (!req.body || !req.headers['stripe-signature']) {
            res.writeHead(400);
            return res.end();
        }
        let event;
        try {
            event = this.webhookManager.parseWebhook(req.body, req.headers['stripe-signature']);
        } catch (err) {
            logging.error(err);
            res.writeHead(401);
            return res.end();
        }

        logging.info(`Handling webhook ${event.type}`);
        try {
            await this.handleEvent(event);
            res.writeHead(200);
            res.end();
        } catch (err) {
            logging.error(`Error handling webhook ${event.type}`, err);
            res.writeHead(err.statusCode || 500);
            res.end();
        }
    }

    /**
     * @private
     */
    async handleEvent(event) {
        if (!this.handlers[event.type]) {
            return;
        }

        await this.handlers[event.type].call(this, event.data.object);
    }

    /**
     * @private
     */
    async subscriptionEvent(subscription) {
        const subscriptionPriceData = _.get(subscription, 'items.data');
        if (!subscriptionPriceData || subscriptionPriceData.length !== 1) {
            throw new errors.BadRequestError({
                message: 'Subscription should have exactly 1 price item'
            });
        }

        const member = await this.deps.memberRepository.get({
            customer_id: subscription.customer
        });

        if (member) {
            try {
                await this.deps.memberRepository.linkSubscription({
                    id: member.id,
                    subscription
                });
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

    /**
     * @private
     */
    async invoiceEvent(invoice) {
        if (!invoice.subscription) {
            return;
        }
        const subscription = await this.api.getSubscription(invoice.subscription, {
            expand: ['default_payment_method']
        });

        const member = await this.deps.memberRepository.get({
            customer_id: subscription.customer
        });

        if (member) {
            if (invoice.paid && invoice.amount_paid !== 0) {
                await this.deps.eventRepository.registerPayment({
                    member_id: member.id,
                    currency: invoice.currency,
                    amount: invoice.amount_paid
                });
            }
        } else {
            // Subscription has more than one plan - meaning it is not one created by us - ignore.
            if (!subscription.plan) {
                return;
            }
            // Subscription is for a different product - ignore.
            const product = await this.deps.productRepository.get({
                stripe_product_id: subscription.plan.product
            });
            if (!product) {
                return;
            }

            // Could not find the member, which we need in order to insert an payment event.
            throw new errors.NotFoundError({
                message: `No member found for customer ${subscription.customer}`
            });
        }
    }

    /**
     * @private
     */
    async checkoutSessionEvent(session) {
        if (session.mode === 'setup') {
            const setupIntent = await this.api.getSetupIntent(session.setup_intent);
            const member = await this.deps.memberRepository.get({
                customer_id: setupIntent.metadata.customer_id
            });

            if (!member) {
                return;
            }

            await this.api.attachPaymentMethodToCustomer(
                setupIntent.metadata.customer_id,
                setupIntent.payment_method
            );

            if (setupIntent.metadata.subscription_id) {
                const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
                    setupIntent.metadata.subscription_id,
                    setupIntent.payment_method
                );
                try {
                    await this.deps.memberRepository.linkSubscription({
                        id: member.id,
                        subscription: updatedSubscription
                    });
                } catch (err) {
                    if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                        throw err;
                    }
                    throw new errors.ConflictError({
                        err
                    });
                }
                return;
            }

            const subscriptions = await member.related('stripeSubscriptions').fetch();

            const activeSubscriptions = subscriptions.models.filter((subscription) => {
                return ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.get('status'));
            });

            for (const subscription of activeSubscriptions) {
                if (subscription.get('customer_id') === setupIntent.metadata.customer_id) {
                    const updatedSubscription = await this.api.updateSubscriptionDefaultPaymentMethod(
                        subscription.get('subscription_id'),
                        setupIntent.payment_method
                    );
                    try {
                        await this.deps.memberRepository.linkSubscription({
                            id: member.id,
                            subscription: updatedSubscription
                        });
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
        }

        if (session.mode === 'subscription') {
            const customer = await this.api.getCustomer(session.customer, {
                expand: ['subscriptions.data.default_payment_method']
            });

            let member = await this.deps.memberRepository.get({
                email: customer.email
            });

            const checkoutType = _.get(session, 'metadata.checkoutType');

            if (!member) {
                const metadataName = _.get(session, 'metadata.name');
                const metadataNewsletters = _.get(session, 'metadata.newsletters');
                const attribution = {
                    id: session.metadata.attribution_id ?? null,
                    url: session.metadata.attribution_url ?? null,
                    type: session.metadata.attribution_type ?? null,
                    referrerSource: session.metadata.referrer_source ?? null,
                    referrerMedium: session.metadata.referrer_medium ?? null,
                    referrerUrl: session.metadata.referrer_url ?? null
                };

                const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');
                const name = metadataName || payerName || null;

                const memberData = {email: customer.email, name, attribution};
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
                    offerId
                };
                member = await this.deps.memberRepository.create(memberDataWithStripeCustomer);
            } else {
                const payerName = _.get(customer, 'subscriptions.data[0].default_payment_method.billing_details.name');
                const attribution = {
                    id: session.metadata?.attribution_id ?? null,
                    url: session.metadata?.attribution_url ?? null,
                    type: session.metadata?.attribution_type ?? null,
                    referrerSource: session.metadata.referrer_source ?? null,
                    referrerMedium: session.metadata.referrer_medium ?? null,
                    referrerUrl: session.metadata.referrer_url ?? null
                };

                if (payerName && !member.get('name')) {
                    await this.deps.memberRepository.update({name: payerName}, {id: member.get('id')});
                }

                await this.deps.memberRepository.upsertCustomer({
                    customer_id: customer.id,
                    member_id: member.id,
                    name: customer.name,
                    email: customer.email
                });

                for (const subscription of customer.subscriptions.data) {
                    try {
                        const offerId = session.metadata?.offer;

                        await this.deps.memberRepository.linkSubscription({
                            id: member.id,
                            subscription,
                            offerId,
                            attribution
                        });
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

            if (checkoutType !== 'upgrade') {
                this.sendSignupEmail(customer.email);
            }
        }
    }
};
