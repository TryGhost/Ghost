const debug = require('ghost-ignition').debug('stripe');
const _ = require('lodash');
const {retrieve, list, create, update, del} = require('./api/stripeRequests');
const api = require('./api');

const STRIPE_API_VERSION = '2019-09-09';

const CURRENCY_SYMBOLS = {
    usd: '$',
    aud: '$',
    cad: '$',
    gbp: '£',
    eur: '€',
    inr: '₹'
};

module.exports = class StripePaymentProcessor {
    constructor(config, storage, logging) {
        this.logging = logging;
        this.storage = storage;
        this._ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
        this._configure(config);
    }

    async ready() {
        return this._ready;
    }

    async _configure(config) {
        this._stripe = require('stripe')(config.secretKey);
        this._stripe.setAppInfo(config.appInfo);
        this._stripe.setApiVersion(STRIPE_API_VERSION);
        this._stripe.__TEST_MODE__ = config.secretKey.startsWith('sk_test_');
        this._public_token = config.publicKey;
        this._checkoutSuccessUrl = config.checkoutSuccessUrl;
        this._checkoutCancelUrl = config.checkoutCancelUrl;
        this._billingSuccessUrl = config.billingSuccessUrl;
        this._billingCancelUrl = config.billingCancelUrl;

        try {
            this._product = await api.products.ensure(this._stripe, config.product);
        } catch (err) {
            this.logging.error('There was an error creating the Stripe Product');
            this.logging.error(err);
            return this._rejectReady(err);
        }

        /**
         * @type Array<import('stripe').plans.IPlan>
         */
        this._plans = [];
        for (const planSpec of config.plans) {
            try {
                const plan = await api.plans.ensure(this._stripe, planSpec, this._product);
                this._plans.push(plan);
            } catch (err) {
                this.logging.error('There was an error creating the Stripe Plan');
                this.logging.error(err);
                return this._rejectReady(err);
            }
        }

        if (process.env.WEBHOOK_SECRET) {
            this.logging.warn(`Skipping Stripe webhook creation and validation, using WEBHOOK_SECRET environment variable`);
            this._webhookSecret = process.env.WEBHOOK_SECRET;
            return this._resolveReady({
                product: this._product,
                plans: this._plans
            });
        }

        const webhookConfig = {
            url: config.webhookHandlerUrl,
            enabled_events: [
                'checkout.session.completed',
                'customer.subscription.deleted',
                'customer.subscription.updated',
                'invoice.payment_succeeded',
                'invoice.payment_failed'
            ]
        };

        // @TODO Delete this next time you're here
        // This is a fix for the previous release of Ghost (3.25.0)
        try {
            const webhooks = await list(this._stripe, 'webhookEndpoints', {
                limit: 100
            });

            const webhooksToCleanup = webhooks.data.filter((webhook) => {
                return webhook.url === config.webhookHandlerUrl.slice(0, -1) || webhook.url === config.webhookHandlerUrl;
            });

            for (const webhookToCleanup of webhooksToCleanup) {
                await del(this._stripe, 'webhookEndpoints', webhookToCleanup.id);
            }
        } catch (err) {
            this.logging.warn(`There was an error cleaning up the old webhooks`);
        }

        const setupWebhook = async (id, secret, opts = {}) => {
            if (!id || !secret || opts.forceCreate) {
                if (id && !opts.skipDelete) {
                    try {
                        this.logging.info(`Deleting Stripe webhook ${id}`);
                        await del(this._stripe, 'webhookEndpoints', id);
                    } catch (err) {
                        this.logging.error(`Unable to delete Stripe webhook with id: ${id}`);
                        this.logging.error(err);
                    }
                }
                try {
                    this.logging.info(`Creating Stripe webhook with url: ${webhookConfig.url}, version: ${STRIPE_API_VERSION}, events: ${webhookConfig.enabled_events.join(', ')}`);
                    const webhook = await create(this._stripe, 'webhookEndpoints', Object.assign({}, webhookConfig, {
                        api_version: STRIPE_API_VERSION
                    }));
                    return {
                        id: webhook.id,
                        secret: webhook.secret
                    };
                } catch (err) {
                    this.logging.error('Failed to create Stripe webhook. For local development please see https://ghost.org/docs/members/webhooks/#stripe-webhooks');
                    this.logging.error(err);
                    throw err;
                }
            } else {
                try {
                    this.logging.info(`Updating Stripe webhook ${id} with url: ${webhookConfig.url}, events: ${webhookConfig.enabled_events.join(', ')}`);
                    const updatedWebhook = await update(this._stripe, 'webhookEndpoints', id, webhookConfig);

                    if (updatedWebhook.api_version !== STRIPE_API_VERSION) {
                        throw new Error(`Webhook ${id} has api_version ${updatedWebhook.api_version}, expected ${STRIPE_API_VERSION}`);
                    }

                    return {
                        id,
                        secret
                    };
                } catch (err) {
                    this.logging.error(`Unable to update Stripe webhook ${id}`);
                    this.logging.error(err);
                    if (err.code === 'resource_missing') {
                        return setupWebhook(id, secret, {skipDelete: true, forceCreate: true});
                    }
                    return setupWebhook(id, secret, {skipDelete: false, forceCreate: true});
                }
            }
        };

        try {
            const webhook = await setupWebhook(config.webhook.id, config.webhook.secret);
            await this.storage.set({
                webhook: {
                    webhook_id: webhook.id,
                    secret: webhook.secret
                }
            });
            this._webhookSecret = webhook.secret;
        } catch (err) {
            return this._rejectReady(err);
        }

        return this._resolveReady({
            product: this._product,
            plans: this._plans
        });
    }

    async parseWebhook(body, signature) {
        try {
            const event = await this._stripe.webhooks.constructEvent(body, signature, this._webhookSecret);
            debug(`Parsed webhook event: ${event.type}`);
            return event;
        } catch (err) {
            this.logging.error(`Error verifying webhook signature, using secret ${this._webhookSecret}`);
            throw err;
        }
    }

    async createCheckoutSession(member, planName, options) {
        let customer;
        if (member) {
            try {
                customer = await this._customerForMemberCheckoutSession(member);
            } catch (err) {
                debug(`Ignoring Error getting customer for checkout ${err.message}`);
                customer = null;
            }
        } else {
            customer = null;
        }
        const plan = this._plans.find(plan => plan.nickname === planName);
        const customerEmail = (!customer && options.customerEmail) ? options.customerEmail : undefined;
        const metadata = options.metadata || undefined;
        const session = await this._stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            success_url: options.successUrl || this._checkoutSuccessUrl,
            cancel_url: options.cancelUrl || this._checkoutCancelUrl,
            customer: customer ? customer.id : undefined,
            customer_email: customerEmail,
            metadata,
            subscription_data: {
                trial_from_plan: true,
                items: [{
                    plan: plan.id
                }]
            }
        });

        return {
            sessionId: session.id,
            publicKey: this._public_token
        };
    }

    async linkStripeCustomer(id, member) {
        const customer = await retrieve(this._stripe, 'customers', id);

        await this._updateCustomer(member, customer);

        debug(`Linking customer:${id} subscriptions`, JSON.stringify(customer.subscriptions));

        if (customer.subscriptions && customer.subscriptions.data) {
            for (const subscription of customer.subscriptions.data) {
                await this._updateSubscription(subscription);
            }
        }

        return customer;
    }

    async getStripeCustomer(id) {
        return await retrieve(this._stripe, 'customers', id);
    }

    async createCheckoutSetupSession(member, options) {
        const customer = await this._customerForMemberCheckoutSession(member);

        const session = await this._stripe.checkout.sessions.create({
            mode: 'setup',
            payment_method_types: ['card'],
            success_url: options.successUrl || this._billingSuccessUrl,
            cancel_url: options.cancelUrl || this._billingCancelUrl,
            customer_email: member.email,
            setup_intent_data: {
                metadata: {
                    customer_id: customer.id
                }
            }
        });

        return {
            sessionId: session.id,
            publicKey: this._public_token
        };
    }

    async cancelAllSubscriptions(member) {
        const subscriptions = await this.getSubscriptions(member);

        const activeSubscriptions = subscriptions.filter((subscription) => {
            return subscription.status !== 'canceled';
        });

        for (const subscription of activeSubscriptions) {
            try {
                const updatedSubscription = await del(this._stripe, 'subscriptions', subscription.id);
                await this._updateSubscription(updatedSubscription);
            } catch (err) {
                this.logging.error(`There was an error cancelling subscription ${subscription.id}`);
                this.logging.error(err);
            }
        }

        return true;
    }

    async updateSubscriptionFromClient(subscription) {
        const updatedSubscription = await update(
            this._stripe, 'subscriptions',
            subscription.id,
            _.pick(subscription, ['plan', 'cancel_at_period_end'])
        );
        await this._updateSubscription(updatedSubscription);

        return updatedSubscription;
    }

    findPlanByNickname(nickname) {
        return this._plans.find(plan => plan.nickname === nickname);
    }

    async getSubscriptions(member) {
        const metadata = await this.storage.get(member);

        const customers = metadata.customers.reduce((customers, customer) => {
            return Object.assign(customers, {
                [customer.customer_id]: {
                    id: customer.customer_id,
                    name: customer.name,
                    email: customer.email
                }
            });
        }, {});

        return metadata.subscriptions.map((subscription) => {
            return {
                id: subscription.subscription_id,
                customer: customers[subscription.customer_id],
                plan: {
                    id: subscription.plan_id,
                    nickname: subscription.plan_nickname,
                    interval: subscription.plan_interval,
                    amount: subscription.plan_amount,
                    currency: String.prototype.toUpperCase.call(subscription.plan_currency),
                    currency_symbol: CURRENCY_SYMBOLS[subscription.plan_currency]
                },
                status: subscription.status,
                start_date: subscription.start_date,
                default_payment_card_last4: subscription.default_payment_card_last4,
                cancel_at_period_end: subscription.cancel_at_period_end,
                current_period_end: subscription.current_period_end
            };
        });
    }

    async setComplimentarySubscription(member) {
        const subscriptions = await this.getActiveSubscriptions(member);

        // NOTE: Because we allow for multiple Complimentary plans, need to take into account currently availalbe
        //       plan currencies so that we don't end up giving a member complimentary subscription in wrong currency.
        //       Giving member a subscription in different currency would prevent them from resubscribing with a regular
        //       plan if Complimentary is cancelled (ref. https://stripe.com/docs/billing/customer#currency)
        let complimentaryCurrency = this._plans.find(plan => plan.interval === 'month').currency.toLowerCase();

        if (subscriptions.length) {
            complimentaryCurrency = subscriptions[0].plan.currency.toLowerCase();
        }

        const complimentaryFilter = plan => (plan.nickname === 'Complimentary' && plan.currency === complimentaryCurrency);
        const complimentaryPlan = this._plans.find(complimentaryFilter);

        const customer = await this._customerForMemberCheckoutSession(member);

        if (!subscriptions.length) {
            const subscription = await create(this._stripe, 'subscriptions', {
                customer: customer.id,
                items: [{
                    plan: complimentaryPlan.id
                }]
            });

            await this._updateSubscription(subscription);
        } else {
            // NOTE: we should only ever have 1 active subscription, but just in case there is more update is done on all of them
            for (const subscription of subscriptions) {
                const updatedSubscription = await update(this._stripe, 'subscriptions', subscription.id, {
                    proration_behavior: 'none',
                    plan: complimentaryPlan.id
                });

                await this._updateSubscription(updatedSubscription);
            }
        }
    }

    async cancelComplimentarySubscription(member) {
        // NOTE: a more explicit way would be cancelling just the "Complimentary" subscription, but doing it
        //       through existing method achieves the same as there should be only one subscription at a time
        await this.cancelAllSubscriptions(member);
    }

    async getActiveSubscriptions(member) {
        const subscriptions = await this.getSubscriptions(member);

        return subscriptions.filter((subscription) => {
            return subscription.status === 'active' || subscription.status === 'trialing';
        });
    }

    async handleCheckoutSessionCompletedWebhook(member, customer) {
        await this._updateCustomer(member, customer);
        if (!customer.subscriptions || !customer.subscriptions.data) {
            return;
        }
        for (const subscription of customer.subscriptions.data) {
            await this._updateSubscription(subscription);
        }
    }

    async handleCheckoutSetupSessionCompletedWebhook(setupIntent, member) {
        const customerId = setupIntent.metadata.customer_id;
        const paymentMethod = setupIntent.payment_method;

        // NOTE: has to attach payment method before being able to use it as default in the future
        await this._stripe.paymentMethods.attach(paymentMethod, {
            customer: customerId
        });

        const customer = await this.getCustomer(customerId);
        await this._updateCustomer(member, customer);

        if (!customer.subscriptions || !customer.subscriptions.data) {
            return;
        }

        for (const subscription of customer.subscriptions.data) {
            const updatedSubscription = await update(this._stripe, 'subscriptions', subscription.id, {
                default_payment_method: paymentMethod
            });
            await this._updateSubscription(updatedSubscription);
        }
    }

    async handleCustomerSubscriptionDeletedWebhook(subscription) {
        await this._updateSubscription(subscription);
    }

    async handleCustomerSubscriptionUpdatedWebhook(subscription) {
        await this._updateSubscription(subscription);
    }

    async handleInvoicePaymentSucceededWebhook(invoice) {
        const subscription = await retrieve(this._stripe, 'subscriptions', invoice.subscription, {
            expand: ['default_payment_method']
        });
        await this._updateSubscription(subscription);
    }

    async handleInvoicePaymentFailedWebhook(invoice) {
        const subscription = await retrieve(this._stripe, 'subscriptions', invoice.subscription, {
            expand: ['default_payment_method']
        });
        await this._updateSubscription(subscription);
    }

    async _updateCustomer(member, customer) {
        debug(`Attaching customer to member ${member.email} ${customer.id}`);
        await this.storage.set({
            customer: {
                customer_id: customer.id,
                member_id: member.id,
                name: customer.name,
                email: customer.email
            }
        });
    }

    async _updateSubscription(subscription) {
        const payment = subscription.default_payment_method;
        if (typeof payment === 'string') {
            debug(`Fetching default_payment_method for subscription ${subscription.id}`);
            const subscriptionWithPayment = await retrieve(this._stripe, 'subscriptions', subscription.id, {
                expand: ['default_payment_method']
            });
            return this._updateSubscription(subscriptionWithPayment);
        }

        const mappedSubscription = {
            customer_id: subscription.customer,

            subscription_id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: new Date(subscription.current_period_end * 1000),
            start_date: new Date(subscription.start_date * 1000),
            default_payment_card_last4: payment && payment.card && payment.card.last4 || null,

            plan_id: subscription.plan.id,
            // NOTE: Defaulting to interval as migration to nullable field turned out to be much bigger problem.
            //       Ideally, would need nickname field to be nullable on the DB level - condition can be simplified once this is done
            plan_nickname: subscription.plan.nickname || subscription.plan.interval,
            plan_interval: subscription.plan.interval,
            plan_amount: subscription.plan.amount,
            plan_currency: subscription.plan.currency
        };

        debug(`Attaching subscription to customer ${subscription.customer} ${subscription.id}`);
        debug(`Subscription details`, JSON.stringify(mappedSubscription));

        await this.storage.set({
            subscription: mappedSubscription
        });
    }

    async _customerForMemberCheckoutSession(member) {
        const metadata = await this.storage.get(member);

        for (const data of metadata.customers) {
            try {
                const customer = await this.getCustomer(data.customer_id);
                if (!customer.deleted) {
                    return customer;
                }
            } catch (err) {
                debug(`Ignoring Error getting customer for member ${err.message}`);
            }
        }

        debug(`Creating customer for member ${member.email}`);
        const customer = await create(this._stripe, 'customers', {
            email: member.email
        });

        await this._updateCustomer(member, customer);

        return customer;
    }

    async getSetupIntent(id, options) {
        return retrieve(this._stripe, 'setupIntents', id, options);
    }

    async getCustomer(id, options) {
        return retrieve(this._stripe, 'customers', id, options);
    }
};
