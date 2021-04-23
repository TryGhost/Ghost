const debug = require('ghost-ignition').debug('services/stripe');
const Stripe = require('stripe').Stripe;
const LeakyBucket = require('leaky-bucket');
const EXPECTED_API_EFFICIENCY = 0.95;

/** @type {(data: string) => string} */
const hash = data => require('crypto').createHash('sha256').update(data).digest('hex');

const STRIPE_API_VERSION = '2020-08-27';

/**
 * @typedef {import('stripe').Stripe.Customer} ICustomer
 * @typedef {import('stripe').Stripe.Product} IProduct
 * @typedef {import('stripe').Stripe.Plan} IPlan
 * @typedef {import('stripe').Stripe.Price} IPrice
 * @typedef {import('stripe').Stripe.WebhookEndpoint} IWebhookEndpoint
 */

/**
 * @typedef {object} ILogger
 * @prop {(x: any) => void} error
 * @prop {(x: any) => void} info
 * @prop {(x: any) => void} warn
 */

/**
 * @typedef {'customers'|'subscriptions'|'plans'} StripeResource
 */

module.exports = class StripeAPIService {
    /**
     * StripeService
     *
     * @param {object} params
     *
     * @param {ILogger} params.logger
     *
     * @param {object} params.config
     * @param {string} params.config.secretKey
     * @param {string} params.config.publicKey
     * @param {object} params.config.appInfo
     * @param {string} params.config.appInfo.name
     * @param {string} params.config.appInfo.version
     * @param {string} params.config.appInfo.partner_id
     * @param {string} params.config.appInfo.url
     * @param {boolean} params.config.enablePromoCodes
     */
    constructor({config, logger}) {
        /** @type {Stripe} */
        this._stripe = null;
        this.logging = logger;
        this._configured = false;
        if (config.secretKey) {
            this.configure(config);
        }
    }

    get configured() {
        return this._configured;
    }

    get mode() {
        return this._testMode ? 'test' : 'live';
    }

    configure(config) {
        this._stripe = new Stripe(config.secretKey, {
            apiVersion: STRIPE_API_VERSION
        });
        this._config = config;
        this._testMode = config.secretKey && config.secretKey.startsWith('sk_test_');
        if (this._testMode) {
            this._rateLimitBucket = new LeakyBucket(EXPECTED_API_EFFICIENCY * 25, 1);
        } else {
            this._rateLimitBucket = new LeakyBucket(EXPECTED_API_EFFICIENCY * 100, 1);
        }
        this._configured = true;
    }

    /**
     * @param {object} options
     * @param {string} options.name
     *
     * @returns {Promise<IProduct>}
     */
    async createProduct(options) {
        await this._rateLimitBucket.throttle();
        const product = await this._stripe.products.create(options);

        return product;
    }

    /**
     * @param {object} options
     * @param {string} options.product
     * @param {boolean} options.active
     * @param {string} options.nickname
     * @param {string} options.currency
     * @param {number} options.amount
     * @param {'recurring'|'one-time'} options.type
     * @param {Stripe.Price.Recurring.Interval|null} options.interval
     *
     * @returns {Promise<IPrice>}
     */
    async createPrice(options) {
        await this._rateLimitBucket.throttle();
        const price = await this._stripe.prices.create({
            currency: options.currency,
            product: options.product,
            unit_amount: options.amount,
            active: options.active,
            nickname: options.nickname,
            recurring: options.type === 'recurring' ? {
                interval: options.interval
            } : undefined
        });

        return price;
    }

    /**
     * ensureProduct.
     *
     * @param {string} name
     *
     * @returns {Promise<IProduct>}
     */
    async ensureProduct(name) {
        const idSeed = 'Ghost Subscription';

        /** @type {(x: string) => string} */
        const prefixHashSeed = seed => (this._testMode ? `test_${seed}` : `prod_${seed}`);

        /** @type {(idSeed: string) => Promise<IProduct>} */
        const getOrCreateActiveProduct = async (idSeed) => {
            const id = hash(prefixHashSeed(idSeed));
            try {
                await this._rateLimitBucket.throttle();
                const product = await this._stripe.products.retrieve(id);

                if (product.active) {
                    return product;
                }

                return getOrCreateActiveProduct(id);
            } catch (err) {
                if (err.code !== 'resource_missing') {
                    throw err;
                }
                await this._rateLimitBucket.throttle();
                return this._stripe.products.create({
                    id,
                    name
                });
            }
        };

        return getOrCreateActiveProduct(idSeed);
    }

    /**
     * ensurePlan.
     *
     * @param {object} plan
     * @param {object} product
     *
     * @returns {Promise<IPlan>}
     */
    async ensurePlan(plan, product) {
        const idSeed = product.id + plan.interval + plan.currency + plan.amount;

        /** @type {(x: string) => string} */
        const prefixHashSeed = seed => (this._testMode ? `test_${seed}` : `prod_${seed}`);

        /** @type {(idSeed: string) => Promise<IPlan>} */
        const getOrCreateActivePlan = async (idSeed) => {
            const id = hash(prefixHashSeed(idSeed));
            try {
                await this._rateLimitBucket.throttle();
                const plan = await this._stripe.plans.retrieve(id);

                if (plan.active) {
                    return plan;
                }

                return getOrCreateActivePlan(id);
            } catch (err) {
                if (err.code !== 'resource_missing') {
                    throw err;
                }
                await this._rateLimitBucket.throttle();
                return this._stripe.plans.create({
                    id,
                    nickname: plan.name,
                    amount: plan.amount,
                    interval: plan.interval,
                    currency: plan.currency,
                    product: product.id,
                    billing_scheme: 'per_unit'
                });
            }
        };

        return getOrCreateActivePlan(idSeed);
    }

    /**
     * @param {string} id
     * @param {import('stripe').Stripe.CustomerRetrieveParams} options
     *
     * @returns {Promise<ICustomer>}
     */
    async getCustomer(id, options = {}) {
        debug(`getCustomer(${id}, ${JSON.stringify(options)})`);
        try {
            await this._rateLimitBucket.throttle();
            if (options.expand) {
                options.expand.push('subscriptions');
            } else {
                options.expand = ['subscriptions'];
            }
            const customer = await this._stripe.customers.retrieve(id, options);
            debug(`getCustomer(${id}, ${JSON.stringify(options)}) -> Success`);
            return customer;
        } catch (err) {
            debug(`getCustomer(${id}, ${JSON.stringify(options)}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {any} member
     *
     * @returns {Promise<ICustomer>}
     */
    async getCustomerForMemberCheckoutSession(member) {
        await member.related('stripeCustomers').fetch();
        const customers = member.related('stripeCustomers');
        for (const data of customers.models) {
            try {
                const customer = await this.getCustomer(data.get('customer_id'));
                if (!customer.deleted) {
                    return customer;
                }
            } catch (err) {
                debug(`Ignoring Error getting customer for member ${err.message}`);
            }
        }

        debug(`Creating customer for member ${member.get('email')}`);
        const customer = await this.createCustomer({
            email: member.get('email')
        });

        return customer;
    }

    /**
     * @param {import('stripe').Stripe.CustomerCreateParams} options
     *
     * @returns {Promise<ICustomer>}
     */
    async createCustomer(options = {}) {
        debug(`createCustomer(${JSON.stringify(options)})`);
        try {
            await this._rateLimitBucket.throttle();
            const customer = await this._stripe.customers.create(options);
            debug(`createCustomer(${JSON.stringify(options)}) -> Success`);
            return customer;
        } catch (err) {
            debug(`createCustomer(${JSON.stringify(options)}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {string} id
     * @param {string} email
     *
     * @returns {Promise<ICustomer>}
     */
    async updateCustomerEmail(id, email) {
        debug(`updateCustomerEmail(${id}, ${email})`);
        try {
            await this._rateLimitBucket.throttle();
            const customer = await this._stripe.customers.update(id, {email});
            debug(`updateCustomerEmail(${id}, ${email}) -> Success`);
            return customer;
        } catch (err) {
            debug(`updateCustomerEmail(${id}, ${email}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * createWebhook.
     *
     * @param {string} url
     * @param {import('stripe').Stripe.WebhookEndpointUpdateParams.EnabledEvent[]} events
     *
     * @returns {Promise<IWebhookEndpoint>}
     */
    async createWebhookEndpoint(url, events) {
        debug(`createWebhook(${url})`);
        try {
            await this._rateLimitBucket.throttle();
            const webhook = await this._stripe.webhookEndpoints.create({
                url,
                enabled_events: events,
                api_version: STRIPE_API_VERSION
            });
            debug(`createWebhook(${url}) -> Success`);
            return webhook;
        } catch (err) {
            debug(`createWebhook(${url}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {string} id
     *
     * @returns {Promise<void>}
     */
    async deleteWebhookEndpoint(id) {
        debug(`deleteWebhook(${id})`);
        try {
            await this._rateLimitBucket.throttle();
            await this._stripe.webhookEndpoints.del(id);
            debug(`deleteWebhook(${id}) -> Success`);
            return;
        } catch (err) {
            debug(`deleteWebhook(${id}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {string} id
     * @param {string} url
     * @param {import('stripe').Stripe.WebhookEndpointUpdateParams.EnabledEvent[]} events
     *
     * @returns {Promise<IWebhookEndpoint>}
     */
    async updateWebhookEndpoint(id, url, events) {
        debug(`updateWebhook(${id}, ${url})`);
        try {
            await this._rateLimitBucket.throttle();
            const webhook = await this._stripe.webhookEndpoints.update(id, {
                url,
                enabled_events: events
            });
            if (webhook.api_version !== STRIPE_API_VERSION) {
                throw new Error('Webhook has incorrect api_version');
            }
            debug(`updateWebhook(${id}, ${url}) -> Success`);
            return webhook;
        } catch (err) {
            debug(`updateWebhook(${id}, ${url}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * parseWebhook.
     *
     * @param {string} body
     * @param {string} signature
     * @param {string} secret
     *
     * @returns {import('stripe').Stripe.Event}
     */
    parseWebhook(body, signature, secret) {
        debug(`parseWebhook(${body}, ${signature}, ${secret})`);
        try {
            const event = this._stripe.webhooks.constructEvent(body, signature, secret);
            debug(`parseWebhook(${body}, ${signature}, ${secret}) -> Success ${event.type}`);
            return event;
        } catch (err) {
            debug(`parseWebhook(${body}, ${signature}, ${secret}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {IPlan} plan
     * @param {ICustomer} customer
     * @param {object} options
     *
     * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
     */
    async createCheckoutSession(plan, customer, options) {
        const metadata = options.metadata || undefined;
        const customerEmail = customer ? customer.email : options.customerEmail;
        await this._rateLimitBucket.throttle();
        const session = await this._stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            success_url: options.successUrl,
            cancel_url: options.cancelUrl,
            customer_email: customerEmail,
            // @ts-ignore - we need to update to latest stripe library to correctly use newer features
            allow_promotion_codes: this._config.enablePromoCodes,
            metadata,
            subscription_data: {
                trial_from_plan: true,
                items: [{
                    plan: plan.id
                }]
            }
        });

        return session;
    }

    /**
     * @param {ICustomer} customer
     * @param {object} options
     *
     * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
     */
    async createCheckoutSetupSession(customer, options) {
        await this._rateLimitBucket.throttle();
        const session = await this._stripe.checkout.sessions.create({
            mode: 'setup',
            payment_method_types: ['card'],
            success_url: options.successUrl,
            cancel_url: options.cancelUrl,
            customer_email: customer.email,
            setup_intent_data: {
                metadata: {
                    customer_id: customer.id
                }
            }
        });

        return session;
    }

    getPublicKey() {
        return this._config.publicKey;
    }

    /**
     * getPrice
     *
     * @param {string} id
     * @param {object} options
     *
     * @returns {Promise<import('stripe').Stripe.Price>}
     */
    async getPrice(id, options = {}) {
        debug(`getPrice(${id}, ${JSON.stringify(options)})`);

        return await this._stripe.prices.retrieve(id, options);
    }

    /**
     * getPlan
     *
     * @param {string} id
     * @param {object} options
     *
     * @returns {Promise<import('stripe').Stripe.Plan>}
     */
    async getPlan(id, options = {}) {
        debug(`getSubscription(${id}, ${JSON.stringify(options)})`);

        return await this._stripe.plans.retrieve(id, options);
    }

    /**
     * getSubscription.
     *
     * @param {string} id
     * @param {import('stripe').Stripe.SubscriptionRetrieveParams} options
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async getSubscription(id, options = {}) {
        debug(`getSubscription(${id}, ${JSON.stringify(options)})`);
        try {
            await this._rateLimitBucket.throttle();
            const subscription = await this._stripe.subscriptions.retrieve(id, options);
            debug(`getSubscription(${id}, ${JSON.stringify(options)}) -> Success`);
            return subscription;
        } catch (err) {
            debug(`getSubscription(${id}, ${JSON.stringify(options)}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * cancelSubscription.
     *
     * @param {string} id
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async cancelSubscription(id) {
        debug(`cancelSubscription(${id})`);
        try {
            await this._rateLimitBucket.throttle();
            const subscription = await this._stripe.subscriptions.del(id);
            debug(`cancelSubscription(${id}) -> Success`);
            return subscription;
        } catch (err) {
            debug(`cancelSubscription(${id}) -> ${err.type}`);
            throw err;
        }
    }

    /**
     * @param {string} id - The ID of the Subscription to modify
     * @param {string} [reason=''] - The user defined cancellation reason
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async cancelSubscriptionAtPeriodEnd(id, reason = '') {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.update(id, {
            cancel_at_period_end: true,
            metadata: {
                cancellation_reason: reason
            }
        });
        return subscription;
    }

    /**
     * @param {string} id - The ID of the Subscription to modify
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async continueSubscriptionAtPeriodEnd(id) {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.update(id, {
            cancel_at_period_end: false,
            metadata: {
                cancellation_reason: null
            }
        });
        return subscription;
    }

    /**
     * @param {string} id - The ID of the Subscription to modify
     * @param {string} plan - The ID of the new Plan
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async changeSubscriptionPlan(id, plan) {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.update(id, {
            plan,
            cancel_at_period_end: false,
            metadata: {
                cancellation_reason: null
            }
        });
        return subscription;
    }

    /**
     * @param {string} customer - The ID of the Customer to create the subscription for
     * @param {string} price - The ID of the new Price
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async createSubscription(customer, price) {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.create({
            customer,
            items: [{price}]
        });
        return subscription;
    }

    /**
     * @param {string} id
     * @param {import('stripe').Stripe.SetupIntentRetrieveParams} options
     *
     * @returns {Promise<import('stripe').Stripe.SetupIntent>}
     */
    async getSetupIntent(id, options = {}) {
        await this._rateLimitBucket.throttle();
        return await this._stripe.setupIntents.retrieve(id, options);
    }

    /**
     * @param {string} customer
     * @param {string} paymentMethod
     *
     * @returns {Promise<void>}
     */
    async attachPaymentMethodToCustomer(customer, paymentMethod) {
        await this._rateLimitBucket.throttle();
        await this._stripe.paymentMethods.attach(paymentMethod, {customer});
        return;
    }

    /**
     * @param {string} id
     *
     * @returns {Promise<import('stripe').Stripe.PaymentMethod|null>}
     */
    async getCardPaymentMethod(id) {
        await this._rateLimitBucket.throttle();
        const paymentMethod = await this._stripe.paymentMethods.retrieve(id);
        if (paymentMethod.type !== 'card') {
            return null;
        }

        return paymentMethod;
    }

    /**
     * @param {string} subscription
     * @param {string} paymentMethod
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async updateSubscriptionDefaultPaymentMethod(subscription, paymentMethod) {
        await this._rateLimitBucket.throttle();
        return await this._stripe.subscriptions.update(subscription, {
            default_payment_method: paymentMethod
        });
    }
};
