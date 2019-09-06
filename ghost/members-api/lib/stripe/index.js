const api = require('./api');

module.exports = class StripePaymentProcessor {
    constructor(config) {
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

        try {
            this._product = await api.products.ensure(this._stripe, config.product);
        } catch (err) {
            return this._rejectReady(err);
        }

        this._plans = [];
        for (const planSpec of config.plans) {
            try {
                const plan = await api.plans.ensure(this._stripe, planSpec, this._product);
                this._plans.push(plan);
            } catch (err) {
                return this._rejectReady(err);
            }
        }

        return this._resolveReady({
            product: this._product,
            plans: this._plans
        });
    }

    getPublicConfig() {
        return {
            publicKey: this._public_token,
            plans: this._plans.map(({id, currency, amount, interval, nickname}) => ({
                id, currency, amount, interval,
                name: nickname
            }))
        };
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

    async getSubscription(member) {
        return api.subscriptions.get(this._stripe, member);
    }

    async removeSubscription(member) {
        return api.subscriptions.remove(this._stripe, member);
    }

    async removeCustomer(member) {
        return api.customers.remove(this._stripe, member);
    }
};
