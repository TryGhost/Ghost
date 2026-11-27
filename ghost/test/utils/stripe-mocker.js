const DomainEvents = require('@tryghost/domain-events');
const nock = require('nock');
const stripe = require('stripe');
const { z } = require('zod');
let members = {};
let stripeService = {};
let tiers = {};
let models = {};
const crypto = require('crypto');

// @ts-check
/**
 * @typedef {"customers" | "checkout" | "subscriptions" | "coupons" | "payment_methods" | "prices" | "setup_intents" | "products"} resource
 */

/** What Stripe decides an existing customer's tax rules from, as it decodes a session: flags as strings. */
const CustomerTaxSession = z.object({
  customer: z.string().optional(),
  customer_update: z.record(z.string(), z.unknown()).optional(),
  tax_id_collection: z.object({ enabled: z.unknown() }).partial().optional(),
  automatic_tax: z.object({ enabled: z.unknown() }).partial().optional(),
  shipping_address_collection: z.object({ allowed_countries: z.unknown() }).partial().optional(),
});

/**
 * Why Stripe refuses a checkout session for an existing customer, measured against test mode at
 * Ghost's pinned API version with `pnpm --filter @tryghost/e2e stripe:probe`, or null when it
 * would accept it. Stripe checks a tax ID and works out tax against what the customer holds, so
 * the checkout must be allowed to save what those depend on. Messages are Stripe's own, and the
 * browser tests' fake Stripe server refuses the same sessions.
 *
 * @param {unknown} body The session as Stripe decodes it.
 * @param {{address?: unknown} | undefined} customer
 * @returns {string | null}
 */
function customerSessionRefusal(body, customer) {
  const parsed = CustomerTaxSession.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  const session = parsed.data;
  const update = session.customer_update ?? {};
  if (!session.customer) {
    return session.customer_update ? '`customer_update` can only be used with `customer`.' : null;
  }
  const mayUpdate = (/** @type {string} */ field) => update[field] === 'auto';
  const hasAddress = Boolean(customer?.address) || mayUpdate('address');
  // A shipping address is only collected with countries to ship to, as measured.
  const countries = session.shipping_address_collection?.allowed_countries;
  const collectsShipping =
    typeof countries === 'object' && countries !== null && Object.values(countries).length > 0;
  if (session.tax_id_collection?.enabled === 'true') {
    if (!mayUpdate('name')) {
      return (
        'Tax ID collection requires updating business name on the customer. To enable tax ID ' +
        'collection for an existing customer, please set `customer_update[name]` to `auto`.'
      );
    }
    if (!hasAddress) {
      return (
        'We could not find a valid address on the provided customer. To enable tax ID ' +
        'collection, please set `customer_update[address]` to `auto`.'
      );
    }
    if (collectsShipping && !mayUpdate('shipping')) {
      return (
        'Tax ID collection requires updating the shipping address on the provided customer. ' +
        'To enable tax ID collection, please set `customer_update[shipping]` to `auto`.'
      );
    }
  }
  if (session.automatic_tax?.enabled === 'true') {
    if (!hasAddress) {
      return (
        'Automatic tax calculation in Checkout requires a valid address on the Customer. Add a ' +
        "valid address to the Customer or set `customer_update[address]` to 'auto' to save the " +
        'billing address entered in Checkout to the Customer.'
      );
    }
    if (collectsShipping && !mayUpdate('shipping')) {
      return (
        'Automatic tax calculation uses fields saved on the Customer. To collect a shipping ' +
        "address with `automatic_tax` enabled, set `customer_update[shipping]` to 'auto' to " +
        'save the shipping address back to the Customer.'
      );
    }
  }
  return null;
}

/**
 * The Stripe Mocker mimics an in memory version of the Stripe API. We can use it to quickly create new subscriptions and get a close to real world test environment with working webhooks etc.
 *
 * If you create a new subscription, it will by default send the checkout.session.completed webhook.
 * If you update a subscription, it will by default send the customer.subscription.updated webhook.
 */
/**
 * The parts of a Stripe API path: its collection, such as `customers` or `checkout/sessions`, the
 * object it names, if any, and an action on that object, such as `attach` or `expire`.
 *
 * @param {string} uri
 * @returns {{resource?: string, id?: string, action?: string}}
 */
function partsOf(uri) {
  const [, resource, id, action] =
    uri.match(/^\/?v1\/(checkout\/sessions|\w+)(?:\/(\w+))?(?:\/(\w+))?/) || [];
  return { resource, id, action };
}

/** Stripe's answer for an object it doesn't hold. */
function resourceMissing(param, id) {
  return [
    404,
    {
      error: {
        type: 'invalid_request_error',
        code: 'resource_missing',
        param,
        message: `No such ${param}: '${id}'`,
      },
    },
  ];
}

class StripeMocker {
  customers = [];
  subscriptions = [];
  paymentMethods = [];
  setupIntents = [];
  coupons = [];
  prices = [];
  products = [];
  checkoutSessions = [];
  webhookEndpoints = [];

  /**
   * The branding set in the Stripe dashboard. A new checkout session reports it, under any
   * `branding_settings` it was created with.
   */
  checkoutBranding = StripeMocker.defaultCheckoutBranding();
  /** Makes Stripe refuse to expire checkout sessions. */
  failCheckoutExpiry = false;
  /** Makes Stripe refuse checkout sessions sent with a design. */
  refuseCheckoutDesign = false;
  /**
   * Makes Stripe refuse any checkout session sent with `param`, answering with `error` in Stripe's
   * API shape, and accept the session once `param` is left out. Stripe's answer names a parameter
   * only if `error` includes one, so a test can make Stripe refuse without naming the parameter.
   * @type {{param: string, error: object} | null}
   */
  checkoutParamRefusal = null;
  /** Makes Stripe fail every new checkout session with this error, in Stripe's API shape. */
  checkoutSessionError = null;

  /**
   * Requests Stripe fails, as it does when a key is revoked, an object is locked or Stripe can't be
   * reached. Each failure answers every request, or only those for one `resource` (such as
   * `customers` or `checkout/sessions`) and optionally one object `id`, with `reply`: a status and a
   * body in Stripe's API shape, or an error that fails the request before Stripe responds. An `id`
   * of null matches requests that name no object, such as a create. A failure can be kept to one
   * HTTP `method`, and to its first `times` requests.
   *
   * @type {{resource?: string, id?: string | null, method?: string, times?: number, reply: [number, object] | Error}[]}
   */
  failures = [];

  /**
   * Every request Stripe received, in order.
   *
   * @type {{method: string, resource?: string, id?: string, action?: string}[]}
   */
  requests = [];

  /**
   * Awaited before Stripe answers a request, so a test can hold a request back or line several up.
   *
   * @type {((request: {method: string, resource?: string, id?: string, action?: string}) => Promise<void>) | null}
   */
  beforeReply = null;

  /**
   * Awaited after Stripe has handled a request and before its answer is sent, so a test can make an
   * answer arrive late.
   *
   * @type {((request: {method: string, resource?: string, id?: string, action?: string}) => Promise<void>) | null}
   */
  beforeDelivery = null;

  nockInterceptors = [];

  static defaultCheckoutBranding() {
    return {
      display_name: 'Stripe Test Account',
      background_color: '#ffffff',
      button_color: '#0074d4',
      border_style: 'rounded',
      font_family: 'default',
      icon: null,
      logo: null,
    };
  }

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
    this.webhookEndpoints = [];
    this.failures = [];
    this.requests = [];
    this.beforeReply = null;
    this.beforeDelivery = null;
    this.checkoutBranding = StripeMocker.defaultCheckoutBranding();
    this.failCheckoutExpiry = false;
    this.refuseCheckoutDesign = false;
    this.checkoutParamRefusal = null;
    this.checkoutSessionError = null;

    // Fix for now, because of importing order breaking some things when they are not initialized
    members = require('../../core/server/services/members');
    stripeService = require('../../core/server/services/stripe');
    tiers = require('../../core/server/services/tiers').default;
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
        data: [],
      },
      ...overrides,
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
    const product = await models.Product.findOne({ slug: tierSlug });

    if (!product) {
      throw new Error('Product not found with slug ' + tierSlug);
    }
    const tier = await tiers.service.api.read(product.id);
    const payments = members.api.paymentsService;
    const { id } = await payments.createPriceForTierCadence(tier, cadence);
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
  async createTier({ name, currency, monthly_price, yearly_price }) {
    const result = await tiers.service.api.add({
      name: name ?? 'Tier ' + this.#generateRandomId(),
      type: 'paid',
      currency: currency.toUpperCase(),
      monthlyPrice: monthly_price,
      yearlyPrice: yearly_price,
    });
    return await models.Product.findOne({
      id: result.id.toHexString(),
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
  async createTrialSubscription({ customer, price, ...overrides }) {
    return await this.createSubscription({
      customer,
      price,
      status: 'trialing',
      trial_start: Date.now() / 1000,
      trial_end: (Date.now() + 1000 * 60 * 60 * 24 * 7) / 1000,
      ...overrides,
    });
  }

  async createIncompleteSubscription({ customer, price, ...overrides }) {
    return await this.createSubscription({
      customer,
      price,
      status: 'incomplete',
      ...overrides,
    });
  }

  async updateSubscription({ id, ...overrides }) {
    const subscription = this.#postData(this.subscriptions, id, overrides, 'subscriptions')[1];

    // Send update webhook
    await this.sendWebhook({
      type: 'customer.subscription.updated',
      data: {
        object: subscription,
      },
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
  async createSubscription({ customer, price, ...overrides }, options = { sendWebhook: true }) {
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
            id: `si_${this.#generateRandomId()}`,
            price,
          },
        ],
      },
      customer: customer.id,
      ...overrides,
    };
    this.subscriptions.push(subscription);
    customer.subscriptions.data.push(subscription);

    // Announce
    if (options.sendWebhook) {
      await this.sendWebhook({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_${this.#generateRandomId()}`,
            object: 'checkout.session',
            created: Math.floor(Date.now() / 1000),
            mode: 'subscription',
            customer: customer.id,
            subscription: subscriptionId,
            metadata: {
              checkoutType: 'signup',
            },
          },
        },
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
    const setupIntent = arr.find((c) => c.id === id);
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

        const keywords = {
          true: true,
          false: false,
          null: null,
        };
        if (value in keywords) {
          return keywords[value];
        }

        return decodeURIComponent(value);
      },
    });

    if (resource === 'customers') {
      if (!id) {
        // Add default fields
        decoded = {
          object: 'customer',
          subscriptions: {
            type: 'list',
            data: [],
          },
          ...decoded,
        };
      }
    }

    if (resource === 'checkout') {
      if (!id) {
        // Add default fields
        decoded = {
          object: 'checkout.session',
          ...decoded,
          url: 'https://checkout.stripe.com/c/pay/fake-data',
        };
      }
    }

    // Mimic Stripe API: set type based on whether recurring is present
    if (resource === 'prices' && !id) {
      decoded = {
        object: 'price',
        type: decoded.recurring ? 'recurring' : 'one_time',
        ...decoded,
      };
    }

    if (resource === 'subscriptions') {
      // Convert price to price object
      if (Array.isArray(decoded.items)) {
        const first = decoded.items[0];
        if (first && typeof first.price === 'string') {
          const price = this.#getData(this.prices, first.price)[1];
          if (!price) {
            return [400, { error: 'Invalid price ' + first.price }];
          }

          decoded.items = {
            data: [
              {
                id: `si_${this.#generateRandomId()}`,
                ...first,
                price,
              },
            ],
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
            data: [],
          },
          ...decoded,
        };
      }

      // As Stripe does, an update that sets a subscription to end with its current period sets
      // `canceled_at` to the time of that update, and one that sets it to continue clears it.
      if (id && typeof decoded.cancel_at_period_end === 'boolean' && !('canceled_at' in decoded)) {
        decoded.canceled_at = decoded.cancel_at_period_end ? Math.floor(Date.now() / 1000) : null;
      }

      if (typeof decoded.customer === 'string') {
        // Add customer to customer list
        const customer = this.#getData(this.customers, decoded.customer)[1];
        if (!customer) {
          return [400, { error: 'Invalid customer ' + decoded.customer }];
        }
        customer.subscriptions.data.push(decoded);
      }
    }

    if (!id) {
      // create
      decoded.id = `${resource.substr(0, 4)}_${this.#generateRandomId()}`;
      arr.push(decoded);
      if (resource === 'checkout') {
        // Kept as created, so tests see what Ghost sent, and returned as Stripe resolves it.
        return [
          200,
          {
            ...decoded,
            branding_settings: { ...this.checkoutBranding, ...decoded.branding_settings },
          },
        ];
      }
      return [200, decoded];
    }

    // Patch
    const subscription = arr.find((c) => c.id === id);
    if (!subscription) {
      return [404];
    }
    Object.assign(subscription, decoded);
    return [200, subscription];
  }

  /**
   * Answers a request with the failure that matches it, if any, and otherwise with `answer`.
   *
   * @param {string} uri
   * @param {(err: Error | null, result?: any) => void} callback
   * @param {(parts: {resource?: string, id?: string, action?: string}) => any} answer
   */
  #reply(method, uri, callback, answer) {
    const parts = partsOf(uri);
    const request = { method, ...parts };
    this.requests.push(request);

    const respond = () => {
      const failure = this.failures.find(
        (f) =>
          (!f.resource || f.resource === parts.resource) &&
          (f.id === null ? !parts.id : !f.id || f.id === parts.id) &&
          (!f.method || f.method === method) &&
          f.times !== 0,
      );
      if (failure?.times) {
        failure.times -= 1;
      }
      const failed = failure?.reply instanceof Error;
      const reply = failure ? failure.reply : answer(parts);
      const deliver = () => (failed ? callback(reply) : callback(null, reply));

      if (!this.beforeDelivery) {
        return deliver();
      }
      this.beforeDelivery(request).then(deliver, callback);
    };

    if (!this.beforeReply) {
      return respond();
    }
    this.beforeReply(request).then(respond, callback);
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
    interceptor.reply((uri, _body, callback) =>
      this.#reply('GET', uri, callback, (parts) => this.#get(parts)),
    );

    interceptor = nock('https://api.stripe.com')
      .persist()
      .post(/v1\/.*/);

    this.nockInterceptors.push(interceptor);

    interceptor.reply((uri, body, callback) =>
      this.#reply('POST', uri, callback, (parts) => this.#post(parts, body)),
    );

    interceptor = nock('https://api.stripe.com')
      .persist()
      .delete(/v1\/.*/);

    this.nockInterceptors.push(interceptor);

    interceptor.reply((uri, _body, callback) =>
      this.#reply('DELETE', uri, callback, (parts) => this.#delete(parts)),
    );
  }

  /** What Stripe answers a GET with, from the objects it holds. Lists aren't faked. */
  #get({ resource, id }) {
    const collections = {
      setup_intents: this.setupIntents,
      customers: this.customers,
      subscriptions: this.subscriptions,
      coupons: this.coupons,
      payment_methods: this.paymentMethods,
      prices: this.prices,
      products: this.products,
    };
    if (!id || !collections[resource]) {
      return [500];
    }
    return this.#getData(collections[resource], id);
  }

  /** What Stripe answers a POST with, creating or updating the objects it holds. */
  #post({ resource, id, action }, body) {
    if (resource === 'payment_methods' && action === 'attach') {
      return this.#attach(id, require('qs').parse(body).customer);
    }

    const collections = {
      payment_methods: this.paymentMethods,
      subscriptions: this.subscriptions,
      customers: this.customers,
      coupons: this.coupons,
      prices: this.prices,
      products: this.products,
    };
    if (collections[resource] && !action) {
      return this.#postData(collections[resource], id, body, resource);
    }

    if (resource === 'checkout/sessions' && !id) {
      if (this.checkoutSessionError) {
        return [400, { error: this.checkoutSessionError }];
      }
      const session = require('qs').parse(body);
      const refusal = customerSessionRefusal(
        session,
        this.customers.find((customer) => customer.id === session.customer),
      );
      if (refusal) {
        return [400, { error: { type: 'invalid_request_error', message: refusal } }];
      }
      if (this.checkoutParamRefusal && this.checkoutParamRefusal.param in session) {
        return [400, { error: this.checkoutParamRefusal.error }];
      }
      if (this.refuseCheckoutDesign && session.branding_settings) {
        return [
          400,
          {
            error: {
              type: 'invalid_request_error',
              param: 'branding_settings[font_family]',
              message: 'Invalid branding_settings[font_family]',
            },
          },
        ];
      }
      return this.#postData(this.checkoutSessions, null, body, 'checkout');
    }

    if (resource === 'checkout/sessions' && action === 'expire') {
      if (this.failCheckoutExpiry) {
        return [500, { error: { type: 'api_error', message: 'Stripe is down' } }];
      }
      return this.#postData(this.checkoutSessions, id, 'status=expired', 'checkout');
    }

    if (resource === 'webhook_endpoints' && !action) {
      return this.#postWebhookEndpoint(id, require('qs').parse(body));
    }

    return [500];
  }

  /** Creates or updates a webhook endpoint. As at Stripe, only a create answers with the secret. */
  #postWebhookEndpoint(id, { url, api_version: apiVersion }) {
    if (!id) {
      const endpoint = {
        id: `we_${this.#generateRandomId()}`,
        object: 'webhook_endpoint',
        url,
        api_version: apiVersion,
        secret: `whsec_${this.#generateRandomId()}`,
      };
      this.webhookEndpoints.push(endpoint);
      return [200, endpoint];
    }
    const endpoint = this.webhookEndpoints.find((one) => one.id === id);
    if (!endpoint) {
      return resourceMissing('webhook_endpoint', id);
    }
    endpoint.url = url ?? endpoint.url;
    return [200, { ...endpoint, secret: undefined }];
  }

  /** Attaches a payment method to a customer, as Stripe does, refusing either if Stripe lacks it. */
  #attach(paymentMethodId, customerId) {
    const paymentMethod = this.paymentMethods.find((method) => method.id === paymentMethodId);
    if (!paymentMethod) {
      return resourceMissing('payment_method', paymentMethodId);
    }
    if (!this.customers.some((customer) => customer.id === customerId)) {
      return resourceMissing('customer', customerId);
    }
    paymentMethod.customer = customerId;
    return [200, paymentMethod];
  }

  /**
   * What Stripe answers a DELETE with: a subscription canceled now, or a deleted webhook endpoint.
   */
  #delete({ resource, id }) {
    if (resource === 'subscriptions' && id) {
      return this.#postData(
        this.subscriptions,
        id,
        { status: 'canceled', canceled_at: Math.floor(Date.now() / 1000) },
        resource,
      );
    }
    if (resource === 'webhook_endpoints' && id) {
      const index = this.webhookEndpoints.findIndex((endpoint) => endpoint.id === id);
      if (index === -1) {
        return resourceMissing('webhook_endpoint', id);
      }
      this.webhookEndpoints.splice(index, 1);
      return [200, { id, object: 'webhook_endpoint', deleted: true }];
    }
    return [500];
  }

  /**
   * Sends a webhook event to the Stripe webhook controller, signed with the site's webhook secret,
   * as Stripe would send it. Rejects when the webhook doesn't respond with 200, with the error Ghost
   * logged while handling it as the cause.
   *
   * @param {any} event - The webhook event to send.
   * @returns {Promise<void>} - A promise that resolves when the webhook event is handled.
   */
  async sendWebhook(event) {
    // Stripe sends every event at the webhook's API version. An event that names none is sent at
    // Ghost's, so only an event that names another version reaches Ghost as a mismatch.
    const { API_VERSION } = require('../../core/server/services/stripe/stripe-api');
    const payload = JSON.stringify({ api_version: API_VERSION, ...event });
    const req = {
      body: payload,
      headers: {
        'stripe-signature': stripe.webhooks.generateTestHeaderString({
          payload,
          secret: stripeService.webhookManager.webhookSecret,
        }),
      },
    };
    let status;
    const res = {
      writeHead(code) {
        status = code;
      },
      end() {},
    };
    // The webhook logs why it failed rather than throwing, so keep the first error it logs.
    const logging = require('@tryghost/logging');
    const logError = logging.error;
    let cause;
    logging.error = function (...args) {
      cause ??= args
        .map((arg) => (arg instanceof Error ? arg : arg?.err))
        .find((err) => err instanceof Error);
      return logError.apply(this, args);
    };
    try {
      await stripeService.webhookController.handle(req, res);
    } finally {
      logging.error = logError;
    }
    if (status !== 200) {
      throw new Error(`The Stripe webhook responded with ${status} to ${event.type}`, { cause });
    }
  }
}

module.exports = StripeMocker;
