const {retrieve, create} = require('./api/stripeRequests');
const api = require('./api');

module.exports = class StripePaymentProcessor {
    constructor(config, storage) {
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

            try {
                // @TODO Need to somehow not duplicate this every time we boot
                const webhook = await create(this._stripe, 'webhookEndpoints', {
                    url: this._webhookHandlerUrl,
                    enabled_events: ['checkout.session.completed']
                });
                this._webhookSecret = webhook.secret;
            } catch (err) {
                console.log(err);
                this._webhookSecret = process.env.WEBHOOK_SECRET;
            }
        } catch (err) {
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

    async createCheckoutSession(member, planName) {
        const customer = await api.customers.ensure(this._stripe, member, member.email);
        const plan = this._plans.find(plan => plan.nickname === planName);
        const session = await this._stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            success_url: this._checkoutSuccessUrl,
            cancel_url: this._checkoutCancelUrl,
            customer: customer.id,
            subscription_data: {
                items: [{
                    plan: plan.id
                }]
            }
        });

        return session;
    }

    async getActiveSubscriptions(member) {
        const metadata = await this.storage.get(member);

        const customers = await Promise.all(metadata.map((data) => {
            return this.getCustomer(data.customer_id);
        }));

        return customers.reduce(function (subscriptions, customer) {
            if (customer.deleted) {
                return subscriptions;
            }
            return subscriptions.concat(customer.subscriptions.data.reduce(function (subscriptions, subscription) {
                // Subscription has more than one plan
                // was not created by us - ignore it.
                if (!subscription.plan) {
                    return subscriptions;
                }
                // Ignore cancelled subscriptions
                if (subscription.status === 'cancelled') {
                    return subscriptions;
                }
                // Ignore unpaid subscriptions
                if (subscription.status === 'unpaid') {
                    return subscriptions;
                }

                return subscriptions.concat([{
                    customer: customer.id,
                    subscription: subscription.id,
                    plan: subscription.plan.id,
                    name: subscription.plan.nickname,
                    amount: subscription.plan.amount,
                    validUntil: subscription.current_period_end
                }]);
            }, []));
        }, []);
    }

    async addCustomerToMember(member, customer) {
        const metadata = await this.storage.get(member);
        return this.storage.set(member, metadata.concat({
            customer_id: customer.id
        }));
    }

    async _customerForMember(member) {
        const metadata = await this.storage.get(member);

        for (const data in metadata) {
            const customer = await this.getCustomer(data.customer_id);
            if (!customer.deleted) {
                return customer;
            }
        }

        const customer = await create(this._stripe, 'customers', {
            email: member.email
        });

        await this.addCustomerToMember(member, customer);

        return customer;
    }

    async getCustomer(id) {
        return retrieve(this._stripe, 'customers', id);
    }
};
