// @ts-ignore
const {VersionMismatchError} = require('@tryghost/errors');
// @ts-ignore
const debug = require('@tryghost/debug')('stripe');
const Stripe = require('stripe').Stripe;

/* Stripe has the following rate limits:
*  - For most APIs, 100 read requests per second in live mode, 25 read requests per second in test mode
*  - For search, 20 requests per second in both live and test modes
*/
const EXPECTED_API_EFFICIENCY = 0.95;
const EXPECTED_SEARCH_API_EFFICIENCY = 0.15;

const STRIPE_API_VERSION = '2020-08-27';

/**
 * @typedef {import('stripe').Stripe.Customer} ICustomer
 * @typedef {import('stripe').Stripe.DeletedCustomer} IDeletedCustomer
 * @typedef {import('stripe').Stripe.Product} IProduct
 * @typedef {import('stripe').Stripe.Plan} IPlan
 * @typedef {import('stripe').Stripe.Price} IPrice
 * @typedef {import('stripe').Stripe.WebhookEndpoint} IWebhookEndpoint
 */

/**
 * @typedef {object} IStripeAPIConfig
 * @prop {string} secretKey
 * @prop {string} publicKey
 * @prop {boolean} enablePromoCodes
 * @prop {boolean} enableAutomaticTax
 * @prop {string} checkoutSessionSuccessUrl
 * @prop {string} checkoutSessionCancelUrl
 * @prop {string} checkoutSetupSessionSuccessUrl
 * @prop {string} checkoutSetupSessionCancelUrl
 * @prop {boolean} param.testEnv  - indicates if the module is run in test environment (note, NOT the test mode)
 */

module.exports = class StripeAPI {
    /**
     * StripeAPI
     */
    constructor(deps) {
        /** @type {Stripe} */
        this._stripe = null;
        this._configured = false;
        this.labs = deps.labs;
    }

    get PAYMENT_METHOD_TYPES() {
        if (this.labs.isSet('additionalPaymentMethods')) {
            return undefined;
        } else {
            return ['card'];
        }
    }

    get configured() {
        return this._configured;
    }

    get testEnv() {
        return this._config.testEnv;
    }

    get mode() {
        return this._testMode ? 'test' : 'live';
    }

    /**
     * @param {IStripeAPIConfig} config
     * @returns {void}
     */
    configure(config) {
        if (!config) {
            this._stripe = null;
            this._configured = false;
            return;
        }

        // Lazyloaded to protect sites without Stripe configured
        const LeakyBucket = require('leaky-bucket');

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
        this._searchRateLimitBucket = new LeakyBucket(EXPECTED_SEARCH_API_EFFICIENCY * 100, 1);
        this._configured = true;
    }

    /**
     * @param {object} options
     */
    async createCoupon(options) {
        await this._rateLimitBucket.throttle();
        const coupon = await this._stripe.coupons.create(options);

        return coupon;
    }

    /**
     * @param {string} id
     *
     * @returns {Promise<IProduct>}
     */
    async getProduct(id) {
        await this._rateLimitBucket.throttle();
        const product = await this._stripe.products.retrieve(id);

        return product;
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
     * @param {number} [options.amount]
     * @param {{enabled: boolean;maximum?: number;minimum?: number;preset?: number;}} [options.custom_unit_amount]
     * @param {'recurring'|'one-time'} options.type
     * @param {Stripe.Price.Recurring.Interval|null} [options.interval]
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
            // @ts-ignore
            custom_unit_amount: options.custom_unit_amount, // missing in .d.ts definitions in the Stripe node version we use, but should be supported in Stripe API at this version (:
            recurring: options.type === 'recurring' && options.interval ? {
                interval: options.interval
            } : undefined
        });

        return price;
    }

    /**
     * @param {string} id
     * @param {object} options
     * @param {boolean} [options.active]
     * @param {string} [options.nickname]
     *
     * @returns {Promise<IPrice>}
     */
    async updatePrice(id, options) {
        await this._rateLimitBucket.throttle();
        const price = await this._stripe.prices.update(id, {
            active: options.active,
            nickname: options.nickname
        });

        return price;
    }

    /**
     * @param {string} id
     * @param {object} options
     * @param {string} options.name
     *
     * @returns {Promise<IProduct>}
     */
    async updateProduct(id, options) {
        await this._rateLimitBucket.throttle();
        const product = await this._stripe.products.update(id, {
            name: options.name
        });

        return product;
    }

    /**
     * @param {string} id
     * @param {import('stripe').Stripe.CustomerRetrieveParams} options
     *
     * @returns {Promise<ICustomer|IDeletedCustomer>}
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
     * @deprecated
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
                    return /** @type {ICustomer} */(customer);
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
     * Finds a Stripe Customer ID based on the provided email address. Returns null if no customer is found.
     * @param {string} email
     * @see https://stripe.com/docs/api/customers/search
     *
     * @returns {Promise<string|null>} Stripe Customer ID, if found
     */
    async getCustomerIdByEmail(email) {
        await this._searchRateLimitBucket.throttle();
        try {
            const result = await this._stripe.customers.search({
                query: `email:"${email}"`,
                limit: 10,
                expand: ['data.subscriptions']
            });
            const customers = result.data;

            // No customer found, return null
            if (customers.length === 0) {
                return;
            }

            // Return the only customer found
            if (customers.length === 1) {
                return customers[0].id;
            }

            // Multiple customers found, return the one with the most recent subscription
            if (customers.length > 1) {
                let latestCustomer = customers[0];
                let latestSubscriptionTime = 0;

                for (let customer of customers) {
                    // skip customers with no subscriptions
                    if (!customer.subscriptions || !customer.subscriptions.data || customer.subscriptions.data.length === 0) {
                        continue;
                    }

                    // find the customer with the most recent subscription
                    for (let subscription of customer.subscriptions.data) {
                        if (subscription.current_period_end && subscription.current_period_end > latestSubscriptionTime) {
                            latestSubscriptionTime = subscription.current_period_end;
                            latestCustomer = customer;
                        }
                    }
                }

                return latestCustomer.id;
            }
        } catch (err) {
            debug(`getCustomerByEmail(${email}) -> ${err.type}:${err.message}`);
        }
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
                throw new VersionMismatchError({message: 'Webhook has incorrect api_version'});
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
     * @param {string} priceId
     * @param {ICustomer} customer
     *
     * @param {object} options
     * @param {Object.<String, any>} options.metadata
     * @param {string} options.successUrl
     * @param {string} options.cancelUrl
     * @param {string} options.customerEmail
     * @param {number} options.trialDays
     * @param {string} [options.coupon]
     *
     * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
     */
    async createCheckoutSession(priceId, customer, options) {
        const metadata = options.metadata || undefined;
        const customerId = customer ? customer.id : undefined;
        const customerEmail = customer ? customer.email : options.customerEmail;

        await this._rateLimitBucket.throttle();
        let discounts;
        if (options.coupon) {
            discounts = [{coupon: options.coupon}];
        }

        const subscriptionData = {
            trial_from_plan: true,
            items: [{
                plan: priceId
            }]
        };

        /**
         * `trial_from_plan` is deprecated.
         * Replaces it in favor of custom trial period days stored in Ghost
         */
        if (typeof options.trialDays === 'number' && options.trialDays > 0) {
            delete subscriptionData.trial_from_plan;
            subscriptionData.trial_period_days = options.trialDays;
        }

        let stripeSessionOptions = {
            payment_method_types: this.PAYMENT_METHOD_TYPES,
            success_url: options.successUrl || this._config.checkoutSessionSuccessUrl,
            cancel_url: options.cancelUrl || this._config.checkoutSessionCancelUrl,
            // @ts-ignore - we need to update to latest stripe library to correctly use newer features
            allow_promotion_codes: discounts ? undefined : this._config.enablePromoCodes,
            automatic_tax: {
                enabled: this._config.enableAutomaticTax
            },
            metadata,
            discounts,
            /*
            line_items: [{
                price: priceId
            }]
            */
            // This is deprecated and using the old way of doing things with Plans.
            // It should be replaced with the line_items entry above when possible,
            // however, this would lose the "trial from plan" feature which has also
            // been deprecated by Stripe
            subscription_data: subscriptionData
        };

        /* We are only allowed to specify one of these; email will be pulled from
           customer object on Stripe side if that object already exists. */
        if (customerId) {
            stripeSessionOptions.customer = customerId;
        } else {
            stripeSessionOptions.customer_email = customerEmail;
        }

        if (customerId && this._config.enableAutomaticTax) {
            stripeSessionOptions.customer_update = {address: 'auto'};
        }

        // @ts-ignore
        const session = await this._stripe.checkout.sessions.create(stripeSessionOptions);

        return session;
    }

    /**
     * @param {object} options
     * @param {Object.<String, any>} options.metadata
     * @param {string} options.successUrl
     * @param {string} options.cancelUrl
     * @param {string} [options.customer]
     * @param {string} [options.customerEmail]
     *
     * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
     */
    async createDonationCheckoutSession({priceId, successUrl, cancelUrl, metadata, customer, customerEmail}) {
        await this._rateLimitBucket.throttle();

        /**
         * @type {Stripe.Checkout.SessionCreateParams}
         */

        // TODO - add it higher up the stack to the metadata object.
        // add ghost_donation key to metadata object
        metadata = {
            ghost_donation: true,
            ...metadata
        };

        const stripeSessionOptions = {
            mode: 'payment',
            success_url: successUrl || this._config.checkoutSessionSuccessUrl,
            cancel_url: cancelUrl || this._config.checkoutSessionCancelUrl,
            automatic_tax: {
                enabled: this._config.enableAutomaticTax
            },
            metadata,
            customer: customer ? customer.id : undefined,
            customer_email: !customer && customerEmail ? customerEmail : undefined,
            submit_type: 'pay',
            invoice_creation: {
                enabled: true,
                invoice_data: {
                    // Make sure we pass the data through to the invoice
                    metadata: {
                        ghost_donation: true,
                        ...metadata
                    }
                }
            },
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            custom_fields: [
                {
                    key: 'donation_message',
                    label: {
                        type: 'custom',
                        custom: 'Add a personal note'
                    },
                    type: 'text',
                    optional: true
                }
            ]
        };

        if (customer && this._config.enableAutomaticTax) {
            stripeSessionOptions.customer_update = {address: 'auto'};
        }

        // @ts-ignore
        const session = await this._stripe.checkout.sessions.create(stripeSessionOptions);
        return session;
    }

    /**
     * @param {ICustomer} customer
     * @param {object} options
     * @param {string} options.successUrl
     * @param {string} options.cancelUrl
     * @param {string} options.currency - 3-letter ISO code in lowercase, e.g. `usd`
     * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
     */
    async createCheckoutSetupSession(customer, options) {
        await this._rateLimitBucket.throttle();
        const session = await this._stripe.checkout.sessions.create({
            mode: 'setup',
            payment_method_types: this.PAYMENT_METHOD_TYPES,
            success_url: options.successUrl || this._config.checkoutSetupSessionSuccessUrl,
            cancel_url: options.cancelUrl || this._config.checkoutSetupSessionCancelUrl,
            customer_email: customer.email,
            setup_intent_data: {
                metadata: {
                    customer_id: customer.id
                }
            },

            // Note: this is required for dynamic payment methods
            // https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-currency
            currency: this.labs.isSet('additionalPaymentMethods') ? options.currency : undefined
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
     * @param {string} id - The ID of the subscription to remove coupon from
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async removeCouponFromSubscription(id) {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.update(id, {
            coupon: ''
        });
        return subscription;
    }

    /**
     * @param {string} subscriptionId - The ID of the Subscription to modify
     * @param {string} id - The ID of the SubscriptionItem
     * @param {string} price - The ID of the new Price
     * @param {object} [options={}] - Additional data to set on the subscription object
     * @param {('always_invoice'|'create_prorations'|'none')} [options.prorationBehavior='always_invoice'] - The proration behavior to use. See [Stripe docs](https://docs.stripe.com/api/subscriptions/update#update_subscription-proration_behavior) for more info
     * @param {string} [options.cancellationReason=null] - The user defined cancellation reason
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async updateSubscriptionItemPrice(subscriptionId, id, price, options = {}) {
        await this._rateLimitBucket.throttle();
        const subscription = await this._stripe.subscriptions.update(subscriptionId, {
            proration_behavior: options.prorationBehavior || 'always_invoice',
            items: [{
                id,
                price
            }],
            cancel_at_period_end: false,
            metadata: {
                cancellation_reason: options.cancellationReason ?? null
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

    /**
     * @param {string} id - The ID of the subscription to cancel the trial for
     *
     * @returns {Promise<import('stripe').Stripe.Subscription>}
     */
    async cancelSubscriptionTrial(id) {
        await this._rateLimitBucket.throttle();
        return this._stripe.subscriptions.update(id, {
            trial_end: 'now'
        });
    }
};
