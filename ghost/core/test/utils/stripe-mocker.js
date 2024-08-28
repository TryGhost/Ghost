const DomainEvents = require('@tryghost/domain-events');
const nock = require('nock');
let members = {};
let stripeService = {};
let tiers = {};
let models = {};
const crypto = require('crypto');

// @ts-check
/**
 * @typedef {"customers" | "checkout" | "subscriptions" | "coupons" | "payment_methods" | "prices" | "setup_intents" | "products"} resource
 */

/**
 * The Stripe Mocker mimics an in memory version of the Stripe API. We can use it to quickly create new subscriptions and get a close to real world test environment with working webhooks etc.
 * 
 * If you create a new subscription, it will by default send the checkout.session.completed webhook.
 * If you update a subscription, it will by default send the customer.subscription.updated webhook.
 */
class StripeMocker {
    customers = [];
    subscriptions = [];
    paymentMethods = [];
    setupIntents = [];
    coupons = [];
    prices = [];
    products = [];
    checkoutSessions = [];

    nockInterceptors = [];

    constructor(data = {}) {
        this.customers = data.customers ?? [];
        this.subscriptions = data.subscriptions ?? [];
        this.paymentMethods = data.paymentMethods ?? [];
        this.setupIntents = data.setupIntents ?? [];
        this.coupons = data.coupons ?? [];
        this.prices = data.prices ?? [];
        this.products = data.products ?? [];
    }

    reset() {
        this.customers = [];
        this.subscriptions = [];
        this.paymentMethods = [];
        this.setupIntents = [];
        this.coupons = [];
        this.prices = [];
        this.products = [];
        this.checkoutSessions = [];

        // Fix for now, because of importing order breaking some things when they are not initialized
        members = require('../../core/server/services/members');
        stripeService = require('../../core/server/services/stripe');
        tiers = require('../../core/server/services/tiers');
        models = require('../../core/server/models');
    }

    /**
     * Generates a random ID.
     * @returns {string} The generated random ID.
     */
    #generateRandomId() {
        return crypto.randomBytes(8).toString('hex');
    }

    /**
     * Creates a mock Stripe customer.
     * @param {object} overrides - Optional overrides for the customer object.
     * @returns {object} - The created Stripe customer object.
     */
    createCustomer(overrides = {}) {
        const customerId = `cus_${this.#generateRandomId()}`;
        const stripeCustomer = {
            id: customerId,
            object: 'customer',
            name: 'Test User',
            email: customerId + '@example.com',
            subscriptions: {
                type: 'list',
                data: []
            },
            ...overrides
        };
        this.customers.push(stripeCustomer);
        return stripeCustomer;
    }

    /**
     * Fetches a mock Stripe price for a given product/tier (by slug).
     * @param {string} tierSlug
     * @param {'month' | 'year'} cadence
     * @returns {Promise<object>} - The fetched Stripe price object.
     */
    async getPriceForTier(tierSlug, cadence) {
        const product = await models.Product.findOne({slug: tierSlug});

        if (!product) {
            throw new Error('Product not found with slug ' + tierSlug);
        }
        const tier = await tiers.api.read(product.id);
        const payments = members.api.paymentsService;
        const {id} = await payments.createPriceForTierCadence(tier, cadence);
        return this.#getData(this.prices, id)[1];
    }

    /**
     * Creates a Ghost tier (product).
     * @param {object} data
     * @param {string} [data.name]
     * @param {string} data.currency
     * @param {number} data.monthly_price
     * @param {number} data.yearly_price
     * @returns {Promise<object>} - The created product object.
     */
    async createTier({name, currency, monthly_price, yearly_price}) {
        const result = await tiers.api.add({
            name: name ?? ('Tier ' + this.#generateRandomId()),
            type: 'paid',
            currency: currency.toUpperCase(),
            monthlyPrice: monthly_price,
            yearlyPrice: yearly_price
        });
        return await models.Product.findOne({
            id: result.id.toHexString()
        });
    }

    /**
     * Creates a trial subscription.
     *
     * @param {object} options - The options for creating the trial subscription.
     * @param {string} options.customer - The customer ID.
     * @param {string} options.price - The price ID.
     * @param {object} [options.overrides] - Optional overrides for the trial subscription.
     * @returns {Promise<object>} - The created trial subscription object.
     */
    async createTrialSubscription({customer, price, ...overrides}) {
        return await this.createSubscription({
            customer,
            price,
            status: 'trialing',
            trial_start: Date.now() / 1000,
            trial_end: (Date.now() + 1000 * 60 * 60 * 24 * 7) / 1000,
            ...overrides
        });
    }

    async createIncompleteSubscription({customer, price, ...overrides}) {
        return await this.createSubscription({
            customer,
            price,
            status: 'incomplete',
            ...overrides
        });
    }

    async updateSubscription({id, ...overrides}) {
        const subscription = this.#postData(this.subscriptions, id, overrides, 'subscriptions')[1];

        // Send update webhook
        await this.sendWebhook({
            type: 'customer.subscription.updated',
            data: {
                object: subscription
            }
        });
        await DomainEvents.allSettled();
    }

    /**
     * Creates a subscription for a customer.
     *
     * @param {object} data - The data for creating the subscription.
     * @param {object} data.customer - The customer object.
     * @param {object} data.price - The price object.
     * @param {object} [data.overrides] - Optional overrides for the subscription object.
     * @param {object} options - The options for creating the subscription.
     * @param {object} [options.sendWebhook=true] - Whether to send a webhook or not.
     * @returns {Promise<Object>} The created subscription object.
     */
    async createSubscription({customer, price, ...overrides}, options = {sendWebhook: true}) {
        const subscriptionId = `sub_${this.#generateRandomId()}`;

        const subscription = {
            id: subscriptionId,
            object: 'subscription',
            cancel_at_period_end: false,
            canceled_at: null,
            current_period_end: (Date.now() + 1000 * 60 * 60 * 24 * 31) / 1000,
            start_date: Math.floor(Date.now() / 1000),

            status: 'active',
            items: {
                type: 'list',
                data: [
                    {
                        price
                    }
                ]
            },
            customer: customer.id,
            ...overrides
        };
        this.subscriptions.push(subscription);
        customer.subscriptions.data.push(subscription);

        // Announce
        if (options.sendWebhook) {
            await this.sendWebhook({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        metadata: {
                            checkoutType: 'signup'
                        }
                    }
                }
            });
        }

        return subscription;
    }

    /**
     * Retrieves requested data from the in-memory storage similar to a HTTP request.
     *
     * @param {Array} arr - The array to search in.
     * @param {string} id - The id to search for.
     * @returns {Array} - An array containing the HTTP status code and the setup intent object.
     *                   If the setup intent is not found, returns [404].
     */
    #getData(arr, id) {
        const setupIntent = arr.find(c => c.id === id);
        if (!setupIntent) {
            return [404];
        }
        return [200, setupIntent];
    }

    /**
     * Handles creation and updating of in memory resources.
     *
     * @param {Array} arr - The array to store the processed data.
     * @param {string} id - The ID of the resource.
     * @param {string} body - The body of the POST request.
     * @param {resource} resource - The type of resource.
     * @returns {Array} - An array containing the HTTP status code and the processed data.
     */
    #postData(arr, id, body, resource) {
        const qs = require('qs');
        let decoded = qs.parse(body, {
            allowPrototypes: true,
            decoder(value) {
                // Convert numbers to numbers and bools to bools
                if (/^(\d+|\d*\.\d+)$/.test(value)) {
                    return parseFloat(value);
                }

                let keywords = {
                    true: true,
                    false: false,
                    null: null
                };
                if (value in keywords) {
                    return keywords[value];
                }

                return decodeURIComponent(value);
            }
        });

        if (resource === 'customers') {
            if (!id) {
                // Add default fields
                decoded = {
                    object: 'customer',
                    subscriptions: {
                        type: 'list',
                        data: []
                    },
                    ...decoded
                };
            }
        }

        if (resource === 'checkout') {
            if (!id) {
                // Add default fields
                decoded = {
                    object: 'checkout.session',
                    ...decoded,
                    url: 'https://checkout.stripe.com/c/pay/fake-data'
                };
            }
        }

        if (resource === 'subscriptions') {
            // Convert price to price object
            if (Array.isArray(decoded.items)) {
                const first = decoded.items[0];
                if (first && typeof first.price === 'string') {
                    const price = this.#getData(this.prices, first.price)[1];
                    if (!price) {
                        return [400, {error: 'Invalid price ' + first.price}];
                    }

                    decoded.items = {
                        data: [
                            {
                                ...first,
                                price
                            }
                        ]
                    };
                }
            }

            // Add default fields
            if (!id) {
                decoded = {
                    object: 'subscription',
                    cancel_at_period_end: false,
                    canceled_at: null,
                    current_period_end: (Date.now() + 1000 * 60 * 60 * 24 * 31) / 1000,
                    start_date: Math.floor(Date.now() / 1000),

                    status: 'active',
                    items: {
                        type: 'list',
                        data: []
                    },
                    ...decoded
                };
            }

            if (typeof decoded.customer === 'string') {
                // Add customer to customer list
                const customer = this.#getData(this.customers, decoded.customer)[1];
                if (!customer) {
                    return [400, {error: 'Invalid customer ' + decoded.customer}];
                }
                customer.subscriptions.data.push(decoded);
            }
        }

        if (!id) {
            // create
            decoded.id = `${resource.substr(0, 4)}_${this.#generateRandomId()}`;
            arr.push(decoded);
            return [200, decoded];
        }

        // Patch
        const subscription = arr.find(c => c.id === id);
        if (!subscription) {
            return [404];
        }
        Object.assign(subscription, decoded);
        return [200, subscription];
    }

    /**
     * Removes all the registered nock interceptors.
     */
    remove() {
        for (const interceptor of this.nockInterceptors) {
            nock.removeInterceptor(interceptor);
        }
        this.nockInterceptors = [];
    }

    /**
     * Stubs the Stripe API.
     * This will intercept all requests to the Stripe API and return the mocked data. 
     */
    stub() {
        this.remove();

        let interceptor = nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/);
        this.nockInterceptors.push(interceptor);
        interceptor
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'setup_intents') {
                    return this.#getData(this.setupIntents, id);
                }

                if (resource === 'customers') {
                    return this.#getData(this.customers, id);
                }

                if (resource === 'subscriptions') {
                    return this.#getData(this.subscriptions, id);
                }

                if (resource === 'coupons') {
                    return this.#getData(this.coupons, id);
                }

                if (resource === 'payment_methods') {
                    return this.#getData(this.paymentMethods, id);
                }

                if (resource === 'prices') {
                    return this.#getData(this.prices, id);
                }

                if (resource === 'products') {
                    return this.#getData(this.products, id);
                }

                return [500];
            });

        interceptor = nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/);
        this.nockInterceptors.push(interceptor);
        interceptor
            .reply((uri, body) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/?(\w+)){0,2}/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'payment_methods') {
                    return this.#postData(this.paymentMethods, id, body, resource);
                }

                if (resource === 'subscriptions') {
                    return this.#postData(this.subscriptions, id, body, resource);
                }

                if (resource === 'customers') {
                    return this.#postData(this.customers, id, body, resource);
                }

                if (resource === 'coupons') {
                    return this.#postData(this.coupons, id, body, resource);
                }

                if (resource === 'prices') {
                    return this.#postData(this.prices, id, body, resource);
                }

                if (resource === 'products') {
                    return this.#postData(this.products, id, body, resource);
                }

                if (resource === 'checkout' && id === 'sessions') {
                    return this.#postData(this.checkoutSessions, null, body, resource);
                }

                return [500];
            });

        interceptor = nock('https://api.stripe.com')
            .persist()
            .delete(/v1\/.*/);
        this.nockInterceptors.push(interceptor);
        interceptor
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/?(\w+)){0,2}/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'subscriptions') {
                    return this.#postData(this.subscriptions, id, 'status=canceled', resource);
                }

                return [500];
            });
    }

    /**
     * Sends a webhook event to the Stripe webhook controller.
     * 
     * @param {any} event - The webhook event to send.
     * @returns {Promise<void>} - A promise that resolves when the webhook event is handled.
     */
    async sendWebhook(event) {
        const webhookController = stripeService.webhookController;
        await webhookController.handleEvent(event);
    }
}

module.exports = StripeMocker;
