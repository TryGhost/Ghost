import baseDebug from '@tryghost/debug';
import {FakeStripeServer} from './fake-stripe-server';
import {WebhookClient} from './webhook-client';
import {
    buildCheckoutSessionCompletedEvent,
    buildCustomer,
    buildPaymentMethod,
    buildPrice,
    buildSubscription,
    buildSubscriptionCreatedEvent
} from './builders';

const debug = baseDebug('e2e:stripe-service');

export class StripeTestService {
    private readonly server: FakeStripeServer;
    private readonly webhookClient: WebhookClient;

    constructor(server: FakeStripeServer, webhookClient: WebhookClient) {
        this.server = server;
        this.webhookClient = webhookClient;
    }

    async createPaidMemberViaWebhooks(opts: {email: string; name: string}): Promise<void> {
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
    }
}
