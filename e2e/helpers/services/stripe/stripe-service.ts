import baseDebug from '@tryghost/debug';
import {FakeStripeServer} from './fake-stripe-server';
import {WebhookClient} from './webhook-client';
import {
    buildCheckoutSessionCompletedEvent,
    buildCustomer,
    buildInvoicePaymentSucceededEvent,
    buildPaymentMethod,
    buildPrice,
    buildSubscription,
    buildSubscriptionCreatedEvent,
    buildSubscriptionDeletedEvent,
    buildSubscriptionUpdatedEvent
} from './builders';
import type {
    RecordedStripeCheckoutSession,
    StripeCustomer,
    StripePaymentMethod,
    StripePrice,
    StripeProduct,
    StripeSubscription
} from './builders';

const debug = baseDebug('e2e:stripe-service');

export interface CreatedPaidMember {
    customer: StripeCustomer;
    subscription: StripeSubscription;
    price: StripePrice;
    paymentMethod: StripePaymentMethod;
}

export class StripeTestService {
    private readonly server: FakeStripeServer;
    private readonly webhookClient: WebhookClient;

    constructor(server: FakeStripeServer, webhookClient: WebhookClient) {
        this.server = server;
        this.webhookClient = webhookClient;
    }

    getProducts(): StripeProduct[] {
        return this.server.getProducts();
    }

    getPrices(): StripePrice[] {
        return this.server.getPrices();
    }

    getCustomers(): StripeCustomer[] {
        return this.server.getCustomers();
    }

    getCheckoutSessions(): RecordedStripeCheckoutSession[] {
        return this.server.getCheckoutSessions();
    }

    async completeLatestSubscriptionCheckout(opts: {name?: string} = {}): Promise<CreatedPaidMember> {
        const session = this.getCheckoutSessions().at(-1);

        if (!session) {
            throw new Error('No recorded Stripe checkout session found');
        }

        return await this.completeSubscriptionCheckout({
            sessionId: session.response.id,
            name: opts.name
        });
    }

    async createPaidMemberViaWebhooks(opts: {email: string; name: string}): Promise<CreatedPaidMember> {
        // Build Stripe objects
        const customer = buildCustomer({email: opts.email, name: opts.name});
        const price = buildPrice();
        const paymentMethod = buildPaymentMethod({name: opts.name});
        const subscription = buildSubscription({
            customerId: customer.id,
            price,
            paymentMethod
        });

        // Add subscription to customer
        customer.subscriptions.data.push(subscription);

        // Seed server so Ghost can look up all objects
        this.server.upsertCustomer(customer);
        this.server.upsertSubscription(subscription);
        this.server.upsertPaymentMethod(paymentMethod);

        debug('Seeded server with customer=%s, subscription=%s, paymentMethod=%s',
            customer.id, subscription.id, paymentMethod.id);

        await this.sendCheckoutSessionCompletedWebhook(customer.id);
        await this.sendSubscriptionCreatedWebhook(subscription);

        return {customer, subscription, price, paymentMethod};
    }

    async cancelSubscription(opts: {subscription: StripeSubscription}): Promise<void> {
        const subscription = opts.subscription;
        subscription.cancel_at_period_end = true;

        this.server.upsertSubscription(subscription);
        debug('Updated subscription %s with cancel_at_period_end=true', subscription.id);

        const event = buildSubscriptionUpdatedEvent({
            subscription,
            previousAttributes: {cancel_at_period_end: false}
        });
        const response = await this.webhookClient.sendWebhook(event);
        debug('customer.subscription.updated webhook response: %d', response.status);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`customer.subscription.updated webhook failed (${response.status}): ${body}`);
        }
    }

    async deleteSubscription(opts: {subscription: StripeSubscription}): Promise<void> {
        const subscription = opts.subscription;
        subscription.status = 'canceled';
        subscription.canceled_at = Math.floor(Date.now() / 1000);

        this.server.upsertSubscription(subscription);
        debug('Updated subscription %s with status=canceled', subscription.id);

        const event = buildSubscriptionDeletedEvent({subscription});
        const response = await this.webhookClient.sendWebhook(event);
        debug('customer.subscription.deleted webhook response: %d', response.status);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`customer.subscription.deleted webhook failed (${response.status}): ${body}`);
        }
    }

    async sendInvoicePaymentSucceeded(opts: {subscription: StripeSubscription; amount?: number}): Promise<void> {
        const event = buildInvoicePaymentSucceededEvent({
            subscription: opts.subscription,
            amount: opts.amount
        });
        const response = await this.webhookClient.sendWebhook(event);
        debug('invoice.payment_succeeded webhook response: %d', response.status);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`invoice.payment_succeeded webhook failed (${response.status}): ${body}`);
        }
    }

    private async completeSubscriptionCheckout(opts: {sessionId: string; name?: string}): Promise<CreatedPaidMember> {
        const session = this.getCheckoutSessions().find(item => item.response.id === opts.sessionId);

        if (!session) {
            throw new Error(`No recorded Stripe checkout session found for ${opts.sessionId}`);
        }

        const priceId = session.request.subscription_data?.items[0]?.plan;
        if (!priceId) {
            throw new Error(`Checkout session ${opts.sessionId} does not include a subscription price`);
        }

        const price = this.getPrices().find(item => item.id === priceId);
        if (!price) {
            throw new Error(`No recorded Stripe price found for ${priceId}`);
        }

        const customer = this.resolveCheckoutCustomer(session, opts.name);
        const paymentMethod = buildPaymentMethod({name: opts.name ?? customer.name});
        const subscription = buildSubscription({
            customerId: customer.id,
            price,
            paymentMethod
        });

        customer.subscriptions.data.push(subscription);
        session.response.customer = customer.id;

        this.server.upsertCustomer(customer);
        this.server.upsertPaymentMethod(paymentMethod);
        this.server.upsertSubscription(subscription);
        this.server.upsertCheckoutSession(session);

        await this.sendCheckoutSessionCompletedWebhook(customer.id, session.response.metadata);
        await this.sendSubscriptionCreatedWebhook(subscription);

        return {customer, subscription, price, paymentMethod};
    }

    private resolveCheckoutCustomer(session: RecordedStripeCheckoutSession, name?: string): StripeCustomer {
        const email = session.response.customer_email;
        const existingCustomer = this.getCustomers().find((customer) => {
            return customer.id === session.response.customer || (email ? customer.email === email : false);
        });

        if (existingCustomer) {
            return existingCustomer;
        }

        if (!email) {
            throw new Error(`Checkout session ${session.response.id} does not include a customer email`);
        }

        const customer = buildCustomer({
            id: session.response.customer ?? undefined,
            email,
            name: name ?? 'Test User'
        });

        this.server.upsertCustomer(customer);

        return customer;
    }

    private async sendCheckoutSessionCompletedWebhook(customerId: string, metadata?: Record<string, string>): Promise<void> {
        const checkoutEvent = buildCheckoutSessionCompletedEvent({customerId, metadata});
        const checkoutResponse = await this.webhookClient.sendWebhook(checkoutEvent);
        debug('checkout.session.completed webhook response: %d', checkoutResponse.status);
        if (!checkoutResponse.ok) {
            const body = await checkoutResponse.text();
            throw new Error(`checkout.session.completed webhook failed (${checkoutResponse.status}): ${body}`);
        }
    }

    private async sendSubscriptionCreatedWebhook(subscription: StripeSubscription): Promise<void> {
        const subscriptionEvent = buildSubscriptionCreatedEvent({subscription});
        const subscriptionResponse = await this.webhookClient.sendWebhook(subscriptionEvent);
        debug('customer.subscription.created webhook response: %d', subscriptionResponse.status);
        if (!subscriptionResponse.ok) {
            const body = await subscriptionResponse.text();
            throw new Error(`customer.subscription.created webhook failed (${subscriptionResponse.status}): ${body}`);
        }
    }
}
