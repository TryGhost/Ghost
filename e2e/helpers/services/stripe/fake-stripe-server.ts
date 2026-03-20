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
            const customUnitAmount = this.parseCustomUnitAmount(req.body.custom_unit_amount);

            if (requestedProductId && !this.products.has(requestedProductId)) {
                debug(`Cannot create price for missing product: ${requestedProductId}`);
                res.status(400).json({error: {type: 'invalid_request_error', message: 'No such product'}});
                return;
            }

            const syntheticProduct = requestedProductId ? null : buildProduct();
            const productId = requestedProductId ?? syntheticProduct!.id;

            if (syntheticProduct) {
                this.upsertProduct(syntheticProduct);
            }

            const price = buildPrice({
                product: productId,
                active: this.parseBoolean(req.body.active, true),
                nickname: this.parseString(req.body.nickname) ?? null,
                currency: this.parseString(req.body.currency)?.toLowerCase() ?? 'usd',
                unit_amount: customUnitAmount?.enabled ? null : (this.parseNumber(req.body.unit_amount) ?? 0),
                custom_unit_amount: customUnitAmount,
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
                    custom_fields: this.parseCustomFields(req.body.custom_fields),
                    invoice_creation: this.parseInvoiceCreation(req.body.invoice_creation),
                    submit_type: this.parseSubmitType(req.body.submit_type),
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

            if (session.response.mode === 'payment') {
                res.status(200).send(this.renderFakeDonationCheckoutPage(session));
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
                            <p>Session: ${this.escapeHtml(session.response.id)}</p>
                            <p>Mode: ${this.escapeHtml(session.response.mode)}</p>
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

    private escapeHtml(value: string): string {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll('\'', '&#39;');
    }

    private formatCurrency(amount: number, currency: string): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount / 100);
    }

    private getCheckoutPrice(session: RecordedStripeCheckoutSession): StripePrice | null {
        const priceId = session.request.line_items?.[0]?.price ?? session.request.subscription_data?.items[0]?.plan;

        if (!priceId) {
            return null;
        }

        return this.prices.get(priceId) ?? null;
    }

    private getCheckoutCustomer(session: RecordedStripeCheckoutSession): StripeCustomer | null {
        if (!session.response.customer) {
            return null;
        }

        return this.customers.get(session.response.customer) ?? null;
    }

    private renderFakeDonationCheckoutPage(session: RecordedStripeCheckoutSession): string {
        const price = this.getCheckoutPrice(session);
        const customer = this.getCheckoutCustomer(session);
        const amount = price?.custom_unit_amount?.preset ?? price?.unit_amount ?? 0;
        const currency = price?.currency ?? 'usd';
        const formattedAmount = this.formatCurrency(amount, currency);
        const amountInputValue = (amount / 100).toFixed(2);
        const email = session.response.customer_email ?? customer?.email ?? '';

        return `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <title>Fake Stripe Checkout</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                            background: #f6f8fc;
                            color: #15171a;
                            margin: 0;
                            padding: 32px 16px;
                        }

                        main {
                            background: #fff;
                            border-radius: 16px;
                            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
                            margin: 0 auto;
                            max-width: 480px;
                            padding: 32px;
                        }

                        h1 {
                            margin-top: 0;
                        }

                        .stack {
                            display: grid;
                            gap: 16px;
                        }

                        .row {
                            display: grid;
                            gap: 8px;
                        }

                        label {
                            display: grid;
                            font-size: 14px;
                            font-weight: 600;
                            gap: 6px;
                        }

                        input, select, button {
                            border: 1px solid #d8dbe6;
                            border-radius: 8px;
                            font: inherit;
                            padding: 12px;
                        }

                        button {
                            background: #15171a;
                            color: #fff;
                            cursor: pointer;
                        }

                        button.secondary {
                            background: #fff;
                            color: #15171a;
                        }

                        #customUnitAmount {
                            display: none;
                        }

                        [data-testid="product-summary-total-amount"] {
                            font-size: 24px;
                            font-weight: 700;
                        }
                    </style>
                </head>
                <body>
                    <main>
                        <div class="stack">
                            <div>
                                <h1>Fake Stripe Checkout</h1>
                                <p>Session: ${this.escapeHtml(session.response.id)}</p>
                                <p>Mode: ${this.escapeHtml(session.response.mode)}</p>
                            </div>

                            <div class="row">
                                <span data-testid="product-summary-total-amount">${this.escapeHtml(formattedAmount)}</span>
                                <button class="secondary" data-testid="change-amount-button" id="changeAmountButton" type="button">Change amount</button>
                                <label>
                                    Custom amount
                                    <input id="customUnitAmount" inputmode="decimal" value="${this.escapeHtml(amountInputValue)}" />
                                </label>
                            </div>

                            <label>
                                Email
                                <input id="email" type="email" value="${this.escapeHtml(email)}" />
                            </label>

                            <button data-testid="card-tab-button" type="button">Card</button>

                            <label>
                                Card number
                                <input id="cardNumber" value="4242 4242 4242 4242" />
                            </label>

                            <label>
                                Expiry
                                <input id="cardExpiry" value="12 / 30" />
                            </label>

                            <label>
                                CVC
                                <input id="cardCvc" value="424" />
                            </label>

                            <label>
                                Billing name
                                <input id="billingName" value="${this.escapeHtml(customer?.name ?? 'Testy McTesterson')}" />
                            </label>

                            <label>
                                Country or region
                                <select aria-label="Country or region">
                                    <option value="US">United States</option>
                                </select>
                            </label>

                            <label>
                                Postal code
                                <input id="billingPostalCode" value="42424" />
                            </label>

                            <button data-testid="hosted-payment-submit-button" type="button">Pay</button>
                        </div>
                    </main>

                    <script>
                        const amountInput = document.getElementById('customUnitAmount');
                        const amountToggle = document.getElementById('changeAmountButton');
                        const totalAmount = document.querySelector('[data-testid="product-summary-total-amount"]');
                        const formatter = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: ${JSON.stringify(currency.toUpperCase())}
                        });

                        const renderAmount = () => {
                            const parsed = Number.parseFloat(amountInput.value || '0');

                            if (!Number.isFinite(parsed)) {
                                totalAmount.textContent = formatter.format(0);
                                return;
                            }

                            totalAmount.textContent = formatter.format(parsed);
                        };

                        amountToggle.addEventListener('click', () => {
                            amountInput.style.display = 'block';
                            amountInput.focus();
                            amountInput.select();
                        });

                        amountInput.addEventListener('input', renderAmount);
                        renderAmount();
                    </script>
                </body>
            </html>`;
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
                .filter((entry): entry is [string, string | number | boolean] => {
                    return typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean';
                })
                .map(([key, entryValue]) => [key, String(entryValue)])
        );
    }

    private parseCustomUnitAmount(value: unknown): StripePrice['custom_unit_amount'] {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const customUnitAmount = value as {enabled?: boolean | string; preset?: number | string};

        if (!this.parseBoolean(customUnitAmount.enabled)) {
            return null;
        }

        return {
            enabled: true,
            preset: this.parseNumber(customUnitAmount.preset) ?? null
        };
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
                .filter((item): item is {plan?: string} => item !== null && typeof item === 'object')
                .map(item => ({plan: this.parseString(item?.plan) ?? ''}))
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
            .filter((item): item is {price?: string; quantity?: number | string} => item !== null && typeof item === 'object')
            .map((item) => {
                return {
                    price: this.parseString(item?.price) ?? '',
                    quantity: this.parseNumber(item?.quantity) ?? 1
                };
            })
            .filter(item => item.price);
    }

    private parseCustomFields(value: unknown): RecordedStripeCheckoutSession['request']['custom_fields'] {
        if (!value || typeof value !== 'object') {
            return undefined;
        }

        const customFields = Array.isArray(value)
            ? value
            : Object.values(value as Record<string, {
                key?: string;
                label?: {custom?: string};
                optional?: boolean | string;
                text?: {value?: string};
                type?: string;
            }>);

        return customFields
            .filter((field): field is {
                key?: string;
                label?: {custom?: string};
                optional?: boolean | string;
                text?: {value?: string};
                type?: string;
            } => field !== null && typeof field === 'object')
            .map((field) => {
                const labelCustom = this.parseString(field.label?.custom);
                const textValue = this.parseString(field.text?.value);

                return {
                    key: this.parseString(field.key) ?? '',
                    type: field.type === 'text' ? 'text' as const : 'text' as const,
                    optional: this.parseBoolean(field.optional),
                    ...(labelCustom ? {label: {custom: labelCustom}} : {}),
                    ...(textValue ? {text: {value: textValue}} : {})
                };
            })
            .filter(field => field.key);
    }

    private parseInvoiceCreation(value: unknown): RecordedStripeCheckoutSession['request']['invoice_creation'] {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }

        const invoiceCreation = value as {
            enabled?: boolean | string;
            invoice_data?: {metadata?: Record<string, unknown>};
        };
        const metadata = this.parseMetadata(invoiceCreation.invoice_data?.metadata);

        return {
            enabled: this.parseBoolean(invoiceCreation.enabled),
            ...(Object.keys(metadata).length > 0 ? {invoice_data: {metadata}} : {})
        };
    }

    private parseSubmitType(value: unknown): RecordedStripeCheckoutSession['request']['submit_type'] {
        if (value !== 'auto' && value !== 'book' && value !== 'donate' && value !== 'pay' && value !== 'send') {
            return undefined;
        }

        return value;
    }
}
