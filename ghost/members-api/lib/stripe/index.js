const debug = require('ghost-ignition').debug('stripe');
const {retrieve, list, create, del} = require('./api/stripeRequests');
const api = require('./api');

const STRIPE_API_VERSION = '2019-09-09';

module.exports = class StripePaymentProcessor {
    constructor(config, storage, logging) {
        this.logging = logging;
        this.storage = storage;
        this._ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
        this._configure(config);
    }

    async ready() {
        return this._ready;
    }

    async _configure(config) {
        this._stripe = require('stripe')(config.secretKey);
        this._stripe.setAppInfo(config.appInfo);
        this._stripe.setApiVersion(STRIPE_API_VERSION);
        this._stripe.__TEST_MODE__ = config.secretKey.startsWith('sk_test_');
        this._public_token = config.publicKey;
        this._checkoutSuccessUrl = config.checkoutSuccessUrl;
        this._checkoutCancelUrl = config.checkoutCancelUrl;
        this._webhookHandlerUrl = config.webhookHandlerUrl;

        try {
            this._product = await api.products.ensure(this._stripe, config.product);

            this._plans = [];
            for (const planSpec of config.plans) {
                const plan = await api.plans.ensure(this._stripe, planSpec, this._product);
                this._plans.push(plan);
            }

            const webhooks = await list(this._stripe, 'webhookEndpoints', {
                limit: 100
            });

            const webhookToDelete = webhooks.data.find((webhook) => {
                return webhook.url === this._webhookHandlerUrl;
            });

            if (webhookToDelete) {
                await del(this._stripe, 'webhookEndpoints', webhookToDelete.id);
            }

            try {
                const webhook = await create(this._stripe, 'webhookEndpoints', {
                    url: this._webhookHandlerUrl,
                    api_version: STRIPE_API_VERSION,
                    enabled_events: ['checkout.session.completed']
                });
                this._webhookSecret = webhook.secret;
            } catch (err) {
                this.logging.warn(err);
                this._webhookSecret = process.env.WEBHOOK_SECRET;
            }
            debug(`Webhook secret set to ${this._webhookSecret}`);
        } catch (err) {
            debug(`Error configuring ${err.message}`);
            return this._rejectReady(err);
        }

        return this._resolveReady({
            product: this._product,
            plans: this._plans
        });
    }

    async parseWebhook(body, signature) {
        return this._stripe.webhooks.constructEvent(body, signature, this._webhookSecret);
    }

    async createCheckoutSession(member, planName, options) {
        let customer;
        if (member) {
            try {
                customer = await this._customerForMemberCheckoutSession(member);
            } catch (err) {
                debug(`Ignoring Error getting customer for checkout ${err.message}`);
                customer = null;
            }
        } else {
            customer = null;
        }
        const plan = this._plans.find(plan => plan.nickname === planName);
        const session = await this._stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            success_url: options.successUrl || this._checkoutSuccessUrl,
            cancel_url: options.cancelUrl || this._checkoutCancelUrl,
            customer: customer ? customer.id : undefined,
            subscription_data: {
                items: [{
                    plan: plan.id
                }]
            }
        });

        return {
            sessionId: session.id,
            publicKey: this._public_token
        };
    }

    async cancelAllSubscriptions(member) {
        const subscriptions = await this.getSubscriptions(member);

        const activeSubscriptions = subscriptions.filter((subscription) => {
            return subscription.status !== 'cancelled';
        });

        await Promise.all(activeSubscriptions.map((subscription) => {
            return del(this._stripe, 'subscriptions', subscription.id);
        }));

        return true;
    }

    async getSubscriptions(member) {
        const metadata = await this.storage.get(member);

        const customers = metadata.customers.reduce((customers, customer) => {
            return Object.assign(customers, {
                [customer.customer_id]: {
                    id: customer.customer_id,
                    name: customer.name,
                    email: customer.email
                }
            });
        }, {});

        return metadata.subscriptions.map((subscription) => {
            return {
                id: subscription.subscription_id,
                customer: customers[subscription.customer_id],
                plan: {
                    id: subscription.plan_id,
                    nickname: subscription.plan_nickname,
                    interval: subscription.plan_interval,
                    amount: subscription.plan_amount,
                    currency: subscription.plan_currency
                },
                status: subscription.status,
                start_date: subscription.start_date,
                default_payment_card_last4: subscription.default_payment_card_last4,
                current_period_end: subscription.current_period_end
            };
        });
    }

    async getActiveSubscriptions(member) {
        const subscriptions = await this.getSubscriptions(member);

        return subscriptions.filter((subscription) => {
            return subscription.status !== 'cancelled' && subscription.status !== 'unpaid';
        });
    }

    async handleCheckoutSessionCompletedWebhook(member, customer) {
        await this._addCustomerToMember(member, customer);
        if (!customer.subscriptions || !customer.subscriptions.data) {
            return;
        }
        for (const subscription of customer.subscriptions.data) {
            await this._updateSubscription(subscription);
        }
    }

    async _addCustomerToMember(member, customer) {
        debug(`Attaching customer to member ${member.email} ${customer.id}`);
        await this.storage.set({
            customer: {
                customer_id: customer.id,
                member_id: member.id,
                name: customer.name,
                email: customer.email
            }
        });
    }

    async _updateSubscription(subscription) {
        debug(`Attaching subscription to customer ${subscription.customer} ${subscription.id}`);
        const payment = subscription.default_payment_method;
        await this.storage.set({
            subscription: {
                customer_id: subscription.customer,

                subscription_id: subscription.id,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000),
                start_date: new Date(subscription.start_date * 1000),
                default_payment_card_last4: payment && payment.card && payment.card.last4 || null,

                plan_id: subscription.plan.id,
                plan_nickname: subscription.plan.nickname,
                plan_interval: subscription.plan.interval,
                plan_amount: subscription.plan.amount,
                plan_currency: subscription.plan.currency
            }
        });
    }

    async _customerForMemberCheckoutSession(member) {
        const metadata = await this.storage.get(member);

        for (const data in metadata.customers) {
            try {
                const customer = await this.getCustomer(data.customer_id);
                if (!customer.deleted) {
                    return customer;
                }
            } catch (err) {
                debug(`Ignoring Error getting customer for member ${err.message}`);
            }
        }

        debug(`Creating customer for member ${member.email}`);
        const customer = await create(this._stripe, 'customers', {
            email: member.email
        });

        await this._addCustomerToMember(member, customer);

        return customer;
    }

    async getCustomer(id, options) {
        return retrieve(this._stripe, 'customers', id, options);
    }
};
