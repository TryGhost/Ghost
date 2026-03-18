import baseDebug from '@tryghost/debug';
import express from 'express';
import http from 'http';
import {
    type RecordedStripeCheckoutSession,
    type StripeCustomer,
    type StripePaymentMethod,
    type StripePrice,
    type StripeProduct,
    type StripeSubscription,
    buildCheckoutSession,
    buildCustomer,
    buildPrice,
    buildProduct
} from './builders';

const debug = baseDebug('e2e:fake-stripe');

export class FakeStripeServer {
    private server: http.Server | null = null;
    private readonly app = express();
    private _port: number;
    private readonly products: Map<string, StripeProduct> = new Map();
    private readonly prices: Map<string, StripePrice> = new Map();
    private readonly customers: Map<string, StripeCustomer> = new Map();
    private readonly subscriptions: Map<string, StripeSubscription> = new Map();
    private readonly paymentMethods: Map<string, StripePaymentMethod> = new Map();
    private readonly checkoutSessions: Map<string, RecordedStripeCheckoutSession> = new Map();

    constructor(port = 0) {
        this._port = port;
        this.setupRoutes();
    }

    get port(): number {
        return this._port;
    }

    upsertProduct(product: StripeProduct): void {
        this.products.set(product.id, product);
    }

    upsertPrice(price: StripePrice): void {
        this.prices.set(price.id, price);
    }

    upsertCustomer(customer: StripeCustomer): void {
        this.customers.set(customer.id, customer);
    }

    upsertSubscription(subscription: StripeSubscription): void {
        this.subscriptions.set(subscription.id, subscription);
    }

    upsertPaymentMethod(paymentMethod: StripePaymentMethod): void {
        this.paymentMethods.set(paymentMethod.id, paymentMethod);
    }

    upsertCheckoutSession(session: RecordedStripeCheckoutSession): void {
        this.checkoutSessions.set(session.response.id, session);
    }

    getProducts(): StripeProduct[] {
        return Array.from(this.products.values());
    }

    getPrices(): StripePrice[] {
        return Array.from(this.prices.values());
    }

    getCustomers(): StripeCustomer[] {
        return Array.from(this.customers.values());
    }

    getCheckoutSessions(): RecordedStripeCheckoutSession[] {
        return Array.from(this.checkoutSessions.values());
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this._port, () => {
                const address = this.server?.address();

                if (!address || typeof address === 'string') {
                    reject(new Error('Fake Stripe server did not expose a TCP port'));
                    return;
                }

                this._port = address.port;
                resolve();
            });
            this.server.on('error', reject);
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = null;
                resolve();
            });
        });
    }

    private setupRoutes(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: true}));

        this.app.use((req, _res, next) => {
            debug(`${req.method} ${req.originalUrl}`);
            next();
        });

        this.app.get('/v1/products/:id', (req, res) => {
            const productId = req.params.id;
            const product = this.products.get(productId);

            if (!product) {
                debug(`Product not found: ${productId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such product'}});
                return;
            }

            debug(`Returning product: ${productId}`);
            res.status(200).json(product);
        });

        this.app.post('/v1/products', (req, res) => {
            const product = buildProduct({
                active: this.parseBoolean(req.body.active, true),
                name: this.parseString(req.body.name) ?? 'Test Product'
            });

            this.upsertProduct(product);
            debug(`Created product: ${product.id} (${product.name})`);
            res.status(200).json(product);
        });

        this.app.get('/v1/prices/:id', (req, res) => {
            const priceId = req.params.id;
            const price = this.prices.get(priceId);

            if (!price) {
                debug(`Price not found: ${priceId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such price'}});
                return;
            }

            debug(`Returning price: ${priceId}`);
            res.status(200).json(price);
        });

        this.app.post('/v1/prices', (req, res) => {
            const interval = this.parsePriceInterval(req.body.recurring?.interval);
            const requestedProductId = this.parseString(req.body.product);
            const syntheticProduct = requestedProductId ? null : buildProduct();
            const productId = requestedProductId ?? syntheticProduct!.id;

            if (syntheticProduct) {
                this.upsertProduct(syntheticProduct);
            }

            const price = buildPrice({
                product: productId,
                active: this.parseBoolean(req.body.active, true),
                nickname: this.parseString(req.body.nickname) ?? null,
                currency: this.parseString(req.body.currency) ?? 'usd',
                unit_amount: this.parseNumber(req.body.unit_amount) ?? 0,
                type: interval ? 'recurring' : 'one_time',
                recurring: interval ? {interval} : null
            });

            this.upsertPrice(price);
            debug(`Created price: ${price.id} (${price.nickname ?? 'unnamed'})`);
            res.status(200).json(price);
        });

        this.app.get('/v1/customers/:id', (req, res) => {
            const customerId = req.params.id;
            const customer = this.customers.get(customerId);

            if (!customer) {
                debug(`Customer not found: ${customerId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such customer'}});
                return;
            }

            const customerSubscriptions = Array.from(this.subscriptions.values())
                .filter(s => s.customer === customerId)
                .map(s => ({
                    ...s,
                    default_payment_method: s.default_payment_method
                        ? (this.paymentMethods.get(s.default_payment_method) ?? s.default_payment_method)
                        : null
                }));

            const response = {
                ...customer,
                subscriptions: {
                    object: 'list' as const,
                    data: customerSubscriptions
                }
            };

            debug(`Returning customer: ${customerId} with ${customerSubscriptions.length} subscription(s)`);
            res.status(200).json(response);
        });

        this.app.post('/v1/customers', (req, res) => {
            const customer = buildCustomer({
                email: this.parseString(req.body.email) ?? 'test@example.com',
                name: this.parseString(req.body.name) ?? 'Test User'
            });

            this.upsertCustomer(customer);
            debug(`Created customer: ${customer.id} (${customer.email})`);
            res.status(200).json(customer);
        });

        this.app.get('/v1/subscriptions/:id', (req, res) => {
            const subscriptionId = req.params.id;
            const subscription = this.subscriptions.get(subscriptionId);

            if (!subscription) {
                debug(`Subscription not found: ${subscriptionId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such subscription'}});
                return;
            }

            const rawExpand = req.query.expand ?? req.query['expand[]'];
            const expand: string[] = Array.isArray(rawExpand)
                ? rawExpand.filter((v): v is string => typeof v === 'string')
                : (typeof rawExpand === 'string' ? [rawExpand] : []);
            const response = {...subscription} as Record<string, unknown>;

            if (expand.includes('default_payment_method') && typeof subscription.default_payment_method === 'string') {
                const pm = this.paymentMethods.get(subscription.default_payment_method);
                if (pm) {
                    response.default_payment_method = pm;
                }
            }

            debug(`Returning subscription: ${subscriptionId} (expand: ${expand.join(', ') || 'none'})`);
            res.status(200).json(response);
        });

        this.app.get('/v1/payment_methods/:id', (req, res) => {
            const paymentMethodId = req.params.id;
            const paymentMethod = this.paymentMethods.get(paymentMethodId);

            if (!paymentMethod) {
                debug(`Payment method not found: ${paymentMethodId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such payment method'}});
                return;
            }

            debug(`Returning payment method: ${paymentMethodId}`);
            res.status(200).json(paymentMethod);
        });

        this.app.post('/v1/checkout/sessions', (req, res) => {
            const mode = this.parseCheckoutMode(req.body.mode);
            const session = buildCheckoutSession({
                request: {
                    subscription_data: this.parseSubscriptionData(req.body.subscription_data),
                    line_items: this.parseLineItems(req.body.line_items)
                },
                response: {
                    mode,
                    customer: this.parseString(req.body.customer) ?? null,
                    customer_email: this.parseString(req.body.customer_email) ?? null,
                    success_url: this.parseString(req.body.success_url) ?? 'http://localhost:2368/?stripe=success',
                    cancel_url: this.parseString(req.body.cancel_url) ?? 'http://localhost:2368/?stripe=cancel',
                    metadata: this.parseMetadata(req.body.metadata)
                }
            });

            session.response.url = `http://localhost:${this._port}/checkout/sessions/${session.response.id}`;
            this.upsertCheckoutSession(session);
            debug(`Created checkout session: ${session.response.id} (${session.response.mode})`);
            res.status(200).json(session.response);
        });

        this.app.get('/checkout/sessions/:id', (req, res) => {
            const sessionId = req.params.id;
            const session = this.checkoutSessions.get(sessionId);

            if (!session) {
                res.status(404).send('Unknown fake checkout session');
                return;
            }

            res.status(200).send(`<!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <title>Fake Stripe Checkout</title>
                    </head>
                    <body>
                        <main>
                            <h1>Fake Stripe Checkout</h1>
                            <p>Session: ${session.response.id}</p>
                            <p>Mode: ${session.response.mode}</p>
                        </main>
                    </body>
                </html>`);
        });

        this.app.post('/v1/billing_portal/configurations/:id?', (req, res) => {
            const id = req.params.id || 'bpc_fake';
            debug(`Returning billing portal configuration: ${id}`);
            res.status(200).json({id, object: 'billing_portal.configuration'});
        });

        this.app.use((req, res) => {
            debug(`Unhandled route: ${req.method} ${req.originalUrl} — returning fallback`);
            res.status(200).json({id: 'fake', object: 'unknown'});
        });
    }

    private parseString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    private parseNumber(value: unknown): number | undefined {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string' && value !== '') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }

    private parseBoolean(value: unknown, fallback = false): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            if (value === 'true') {
                return true;
            }

            if (value === 'false') {
                return false;
            }
        }

        return fallback;
    }

    private parsePriceInterval(value: unknown): StripePrice['recurring'] extends {interval: infer T} | null ? T | undefined : never {
        if (value !== 'day' && value !== 'week' && value !== 'month' && value !== 'year') {
            return undefined;
        }

        return value;
    }

    private parseCheckoutMode(value: unknown): RecordedStripeCheckoutSession['response']['mode'] {
        return value === 'payment' || value === 'setup' ? value : 'subscription';
    }

    private parseMetadata(value: unknown): Record<string, string> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        );
    }

    private parseSubscriptionData(value: unknown): RecordedStripeCheckoutSession['request']['subscription_data'] {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }

        const subscriptionData = value as {
            trial_from_plan?: boolean | string;
            trial_period_days?: number | string;
            items?: Array<{plan?: string}> | Record<string, {plan?: string}>;
            metadata?: Record<string, unknown>;
        };

        const items = Array.isArray(subscriptionData.items)
            ? subscriptionData.items
            : Object.values(subscriptionData.items ?? {});

        const parsedTrialDays = this.parseNumber(subscriptionData.trial_period_days);

        return {
            ...(this.parseBoolean(subscriptionData.trial_from_plan) ? {trial_from_plan: true} : {}),
            ...(typeof parsedTrialDays === 'number' ? {trial_period_days: parsedTrialDays} : {}),
            items: items
                .map(item => ({plan: this.parseString(item.plan) ?? ''}))
                .filter(item => item.plan),
            metadata: this.parseMetadata(subscriptionData.metadata)
        };
    }

    private parseLineItems(value: unknown): RecordedStripeCheckoutSession['request']['line_items'] {
        if (!value || typeof value !== 'object') {
            return undefined;
        }

        const lineItems = Array.isArray(value)
            ? value
            : Object.values(value as Record<string, {price?: string; quantity?: number | string}>);

        return lineItems
            .map((item) => {
                return {
                    price: this.parseString(item.price) ?? '',
                    quantity: this.parseNumber(item.quantity) ?? 1
                };
            })
            .filter(item => item.price);
    }
}
