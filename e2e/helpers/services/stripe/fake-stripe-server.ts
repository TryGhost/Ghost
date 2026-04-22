import express from 'express';
import {FakeServer} from '@/helpers/services/fake-server';
import {
    type RecordedStripeCheckoutSession,
    type StripeCoupon,
    type StripeCustomer,
    type StripePaymentMethod,
    type StripePrice,
    type StripeProduct,
    type StripeSubscription,
    buildCheckoutSession,
    buildCoupon,
    buildCustomer,
    buildPrice,
    buildProduct
} from './builders';
import {renderFakeCheckoutPage, renderFakeDonationCheckoutPage} from './fake-checkout-page-renderer';

export class FakeStripeServer extends FakeServer {
    private readonly products: Map<string, StripeProduct> = new Map();
    private readonly prices: Map<string, StripePrice> = new Map();
    private readonly coupons: Map<string, StripeCoupon> = new Map();
    private readonly customers: Map<string, StripeCustomer> = new Map();
    private readonly subscriptions: Map<string, StripeSubscription> = new Map();
    private readonly paymentMethods: Map<string, StripePaymentMethod> = new Map();
    private readonly checkoutSessions: Map<string, RecordedStripeCheckoutSession> = new Map();

    constructor(port = 0) {
        super({port, debugNamespace: 'e2e:fake-stripe'});
    }

    upsertProduct(product: StripeProduct): void {
        this.products.set(product.id, product);
    }

    upsertPrice(price: StripePrice): void {
        this.prices.set(price.id, price);
    }

    upsertCoupon(coupon: StripeCoupon): void {
        this.coupons.set(coupon.id, coupon);
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

    getCoupons(): StripeCoupon[] {
        return Array.from(this.coupons.values());
    }

    getCustomers(): StripeCustomer[] {
        return Array.from(this.customers.values());
    }

    getSubscriptions(): StripeSubscription[] {
        return Array.from(this.subscriptions.values());
    }

    getCheckoutSessions(): RecordedStripeCheckoutSession[] {
        return Array.from(this.checkoutSessions.values());
    }

    protected setupRoutes(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: true}));

        this.app.get('/v1/products/:id', (req, res) => {
            const productId = req.params.id;
            const product = this.products.get(productId);

            if (!product) {
                this.debug(`Product not found: ${productId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such product'}});
                return;
            }

            this.debug(`Returning product: ${productId}`);
            res.status(200).json(product);
        });

        this.app.post('/v1/products', (req, res) => {
            const product = buildProduct({
                active: this.parseBoolean(req.body.active, true),
                name: this.parseString(req.body.name) ?? 'Test Product'
            });

            this.upsertProduct(product);
            this.debug(`Created product: ${product.id} (${product.name})`);
            res.status(200).json(product);
        });

        this.app.get('/v1/prices/:id', (req, res) => {
            const priceId = req.params.id;
            const price = this.prices.get(priceId);

            if (!price) {
                this.debug(`Price not found: ${priceId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such price'}});
                return;
            }

            this.debug(`Returning price: ${priceId}`);
            res.status(200).json(price);
        });

        this.app.post('/v1/prices', (req, res) => {
            const interval = this.parsePriceInterval(req.body.recurring?.interval);
            const requestedProductId = this.parseString(req.body.product);
            const customUnitAmount = this.parseCustomUnitAmount(req.body.custom_unit_amount);

            if (requestedProductId && !this.products.has(requestedProductId)) {
                this.debug(`Cannot create price for missing product: ${requestedProductId}`);
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
            this.debug(`Created price: ${price.id} (${price.nickname ?? 'unnamed'})`);
            res.status(200).json(price);
        });

        this.app.get('/v1/customers/:id', (req, res) => {
            const customerId = req.params.id;
            const customer = this.customers.get(customerId);

            if (!customer) {
                this.debug(`Customer not found: ${customerId}`);
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

            this.debug(`Returning customer: ${customerId} with ${customerSubscriptions.length} subscription(s)`);
            res.status(200).json(response);
        });

        this.app.post('/v1/customers', (req, res) => {
            const customer = buildCustomer({
                email: this.parseString(req.body.email) ?? 'test@example.com',
                name: this.parseString(req.body.name) ?? 'Test User'
            });

            this.upsertCustomer(customer);
            this.debug(`Created customer: ${customer.id} (${customer.email})`);
            res.status(200).json(customer);
        });

        this.app.post('/v1/coupons', (req, res) => {
            const badRequest = (message: string, param?: string): void => {
                res.status(400).json({
                    error: {
                        type: 'invalid_request_error',
                        message,
                        ...(param ? {param} : {})
                    }
                });
            };

            const duration = this.parseCouponDuration(req.body.duration);
            const amountOffRaw = req.body.amount_off;
            const percentOffRaw = req.body.percent_off;
            const hasAmountOff = amountOffRaw !== undefined && amountOffRaw !== null && amountOffRaw !== '';
            const hasPercentOff = percentOffRaw !== undefined && percentOffRaw !== null && percentOffRaw !== '';

            if (!duration) {
                return badRequest(
                    'Invalid coupon duration. Must be one of "forever", "once", or "repeating".',
                    'duration'
                );
            }

            if (!hasAmountOff && !hasPercentOff) {
                return badRequest(
                    'You must provide exactly one of percent_off or amount_off.',
                    'percent_off'
                );
            }

            if (hasAmountOff && hasPercentOff) {
                return badRequest(
                    'You cannot provide both percent_off and amount_off.',
                    'percent_off'
                );
            }

            const amountOff = hasAmountOff ? this.parseNumber(amountOffRaw) : undefined;
            const percentOff = hasPercentOff ? this.parseNumber(percentOffRaw) : undefined;

            if (hasAmountOff && typeof amountOff !== 'number') {
                return badRequest('Invalid amount_off. Expected a numeric value.', 'amount_off');
            }

            if (hasPercentOff && typeof percentOff !== 'number') {
                return badRequest('Invalid percent_off. Expected a numeric value.', 'percent_off');
            }

            const currency = this.parseString(req.body.currency)?.toLowerCase() ?? null;
            if (hasAmountOff && !currency) {
                return badRequest('currency is required when amount_off is provided.', 'currency');
            }

            let durationInMonths: number | null = null;
            if (duration === 'repeating') {
                const parsedDurationInMonths = this.parseNumber(req.body.duration_in_months);
                if (typeof parsedDurationInMonths !== 'number' || !Number.isInteger(parsedDurationInMonths) || parsedDurationInMonths <= 0) {
                    return badRequest(
                        'duration_in_months must be a positive integer when duration is repeating.',
                        'duration_in_months'
                    );
                }

                durationInMonths = parsedDurationInMonths;
            }

            const coupon = buildCoupon({
                name: this.parseString(req.body.name) ?? null,
                duration,
                duration_in_months: durationInMonths,
                amount_off: typeof amountOff === 'number' ? amountOff : null,
                currency,
                percent_off: typeof percentOff === 'number' ? percentOff : null
            });

            this.upsertCoupon(coupon);
            this.debug(`Created coupon: ${coupon.id}`);
            res.status(200).json(coupon);
        });

        this.app.get('/v1/subscriptions/:id', (req, res) => {
            const subscriptionId = req.params.id;
            const subscription = this.subscriptions.get(subscriptionId);

            if (!subscription) {
                this.debug(`Subscription not found: ${subscriptionId}`);
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

            this.debug(`Returning subscription: ${subscriptionId} (expand: ${expand.join(', ') || 'none'})`);
            res.status(200).json(response);
        });

        this.app.post('/v1/subscriptions/:id', (req, res) => {
            const subscriptionId = req.params.id;
            const subscription = this.subscriptions.get(subscriptionId);

            if (!subscription) {
                this.debug(`Subscription not found for update: ${subscriptionId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such subscription'}});
                return;
            }

            const itemUpdates = this.parseSubscriptionItemsUpdate(req.body.items);
            const metadata = this.applyMetadataUpdate(subscription.metadata, req.body.metadata);
            const cancelAtPeriodEnd = this.parseOptionalBoolean(req.body.cancel_at_period_end);
            const defaultPaymentMethod = this.parseString(req.body.default_payment_method);
            const updatedSubscription: StripeSubscription = {
                ...subscription,
                metadata
            };

            if (cancelAtPeriodEnd !== undefined) {
                updatedSubscription.cancel_at_period_end = cancelAtPeriodEnd;
            }

            if (defaultPaymentMethod !== undefined) {
                if (defaultPaymentMethod !== '' && !this.paymentMethods.has(defaultPaymentMethod)) {
                    this.debug(`Cannot update subscription ${subscriptionId} with missing payment method: ${defaultPaymentMethod}`);
                    res.status(400).json({error: {type: 'invalid_request_error', message: 'No such payment method'}});
                    return;
                }

                updatedSubscription.default_payment_method = defaultPaymentMethod || null;
            }

            if (req.body.trial_end === 'now') {
                updatedSubscription.trial_end = Math.floor(Date.now() / 1000);
                if (updatedSubscription.status === 'trialing') {
                    updatedSubscription.status = 'active';
                }
            }

            if (itemUpdates.length > 0) {
                const updatedItems = updatedSubscription.items.data.map((item) => {
                    const itemUpdate = itemUpdates.find(update => update.id === item.id);

                    if (!itemUpdate) {
                        return item;
                    }

                    const price = this.prices.get(itemUpdate.price);
                    if (!price) {
                        return item;
                    }

                    return {
                        ...item,
                        price
                    };
                });

                const missingPriceId = itemUpdates.find((update) => {
                    return !this.prices.has(update.price);
                })?.price;

                if (missingPriceId) {
                    this.debug(`Cannot update subscription ${subscriptionId} with missing price: ${missingPriceId}`);
                    res.status(400).json({error: {type: 'invalid_request_error', message: 'No such price'}});
                    return;
                }

                updatedSubscription.items = {
                    ...updatedSubscription.items,
                    data: updatedItems
                };
            }

            this.upsertSubscription(updatedSubscription);
            this.debug(`Updated subscription: ${subscriptionId}`);
            res.status(200).json(updatedSubscription);
        });

        this.app.delete('/v1/subscriptions/:id', (req, res) => {
            const subscriptionId = req.params.id;
            const subscription = this.subscriptions.get(subscriptionId);

            if (!subscription) {
                this.debug(`Subscription not found for delete: ${subscriptionId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such subscription'}});
                return;
            }

            const canceledSubscription: StripeSubscription = {
                ...subscription,
                status: 'canceled',
                canceled_at: Math.floor(Date.now() / 1000),
                cancel_at_period_end: false
            };

            this.upsertSubscription(canceledSubscription);
            this.debug(`Deleted subscription: ${subscriptionId}`);
            res.status(200).json(canceledSubscription);
        });

        this.app.get('/v1/payment_methods/:id', (req, res) => {
            const paymentMethodId = req.params.id;
            const paymentMethod = this.paymentMethods.get(paymentMethodId);

            if (!paymentMethod) {
                this.debug(`Payment method not found: ${paymentMethodId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such payment method'}});
                return;
            }

            this.debug(`Returning payment method: ${paymentMethodId}`);
            res.status(200).json(paymentMethod);
        });

        this.app.post('/v1/checkout/sessions', (req, res) => {
            const mode = this.parseCheckoutMode(req.body.mode);
            const discounts = this.parseDiscounts(req.body.discounts) ?? [];
            const missingCouponId = discounts.find((discount) => {
                return !this.coupons.has(discount.coupon);
            })?.coupon;

            if (missingCouponId) {
                this.debug(`Cannot create checkout session with missing coupon: ${missingCouponId}`);
                res.status(400).json({error: {type: 'invalid_request_error', message: 'No such coupon'}});
                return;
            }

            const session = buildCheckoutSession({
                request: {
                    discounts,
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

            session.response.url = `http://localhost:${this.port}/checkout/sessions/${session.response.id}`;
            this.upsertCheckoutSession(session);
            this.debug(`Created checkout session: ${session.response.id} (${session.response.mode})`);
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
                const price = this.getCheckoutPrice(session);
                const customer = this.getCheckoutCustomer(session);

                res.status(200).send(renderFakeDonationCheckoutPage({
                    amount: price?.custom_unit_amount?.preset ?? price?.unit_amount ?? 0,
                    billingName: customer?.name ?? 'Testy McTesterson',
                    currency: price?.currency ?? 'usd',
                    email: session.response.customer_email ?? customer?.email ?? '',
                    mode: session.response.mode,
                    sessionId: session.response.id
                }));
                return;
            }

            res.status(200).send(renderFakeCheckoutPage({
                mode: session.response.mode,
                sessionId: session.response.id
            }));
        });

        this.app.post('/v1/billing_portal/configurations/:id?', (req, res) => {
            const id = req.params.id || 'bpc_fake';
            this.debug(`Returning billing portal configuration: ${id}`);
            res.status(200).json({id, object: 'billing_portal.configuration'});
        });

        this.app.use((req, res) => {
            this.debug(`Unhandled route: ${req.method} ${req.originalUrl} — returning fallback`);
            res.status(200).json({id: 'fake', object: 'unknown'});
        });
    }

    private parseString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
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

    private parseOptionalBoolean(value: unknown): boolean | undefined {
        if (value === undefined) {
            return undefined;
        }

        return this.parseBoolean(value);
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

    private applyMetadataUpdate(currentMetadata: Record<string, string>, value: unknown): Record<string, string> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return currentMetadata;
        }

        const metadata = {...currentMetadata};

        for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
            if (entryValue === null) {
                delete metadata[key];
                continue;
            }

            if (typeof entryValue === 'string' || typeof entryValue === 'number' || typeof entryValue === 'boolean') {
                metadata[key] = String(entryValue);
            }
        }

        return metadata;
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

    private parseDiscounts(value: unknown): RecordedStripeCheckoutSession['request']['discounts'] {
        if (!value || typeof value !== 'object') {
            return undefined;
        }

        const discounts = Array.isArray(value)
            ? value
            : Object.values(value as Record<string, {coupon?: string}>);

        return discounts
            .filter((item): item is {coupon?: string} => item !== null && typeof item === 'object')
            .map((item) => {
                return {
                    coupon: this.parseString(item.coupon) ?? ''
                };
            })
            .filter(item => item.coupon);
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

    private parseSubscriptionItemsUpdate(value: unknown): Array<{id: string; price: string}> {
        if (!value || typeof value !== 'object') {
            return [];
        }

        const items = Array.isArray(value)
            ? value
            : Object.values(value as Record<string, {id?: string; price?: string}>);

        return items
            .filter((item): item is {id?: string; price?: string} => item !== null && typeof item === 'object')
            .map((item) => {
                return {
                    id: this.parseString(item.id) ?? '',
                    price: this.parseString(item.price) ?? ''
                };
            })
            .filter(item => item.id && item.price);
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

    private parseCouponDuration(value: unknown): StripeCoupon['duration'] | undefined {
        if (value !== 'forever' && value !== 'once' && value !== 'repeating') {
            return undefined;
        }

        return value;
    }
}
