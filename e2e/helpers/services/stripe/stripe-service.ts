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
import type {StripeCustomer, StripePaymentMethod, StripePrice, StripeSubscription} from './builders';

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

        // Send checkout.session.completed webhook
        const checkoutEvent = buildCheckoutSessionCompletedEvent({customerId: customer.id});
        const checkoutResponse = await this.webhookClient.sendWebhook(checkoutEvent);
        debug('checkout.session.completed webhook response: %d', checkoutResponse.status);
        if (!checkoutResponse.ok) {
            const body = await checkoutResponse.text();
            throw new Error(`checkout.session.completed webhook failed (${checkoutResponse.status}): ${body}`);
        }

        // Send customer.subscription.created webhook
        const subscriptionEvent = buildSubscriptionCreatedEvent({subscription});
        const subscriptionResponse = await this.webhookClient.sendWebhook(subscriptionEvent);
        debug('customer.subscription.created webhook response: %d', subscriptionResponse.status);
        if (!subscriptionResponse.ok) {
            const body = await subscriptionResponse.text();
            throw new Error(`customer.subscription.created webhook failed (${subscriptionResponse.status}): ${body}`);
        }

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
}
