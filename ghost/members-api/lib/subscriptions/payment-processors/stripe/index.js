const api = require('./api');

module.exports = class StripePaymentProcessor {
    constructor() {
        this._ready = new Promise((resolve, reject) => {
            this._resolveReady = resolve;
            this._rejectReady = reject;
        });
    }

    configure(config) {
        const stripe = require('stripe')(config.secret_token);
        stripe.__TEST_MODE__ = config.secret_token.startsWith('sk_test_');

        api.products.ensure(stripe, config.product).then((product) => {
            return Promise.all(
                config.plans.map(plan => api.plans.ensure(stripe, plan, product))
            ).then((plans) => {
                this._stripe = stripe;
                this._product = product;
                this._plans = plans;
                this._public_token = config.public_token;
                return {
                    product,
                    plans
                };
            });
        }).then(this._resolveReady, this._rejectReady);

        return this._ready;
    }

    getConfig() {
        if (!this._plans) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        return this._ready.then(() => {
            return this._plans;
        });
    }

    getPublicConfig() {
        if (!this._plans) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        return this._ready.then(() => {
            return {
                adapter: 'stripe',
                config: {
                    publicKey: this._public_token,
                    plans: this._plans.map(({id, currency, amount, interval, nickname}) => ({
                        id, currency, amount, interval,
                        name: nickname
                    }))
                }
            };
        });
    }

    createSubscription(member, metadata) {
        if (!this._stripe) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        if (!metadata.stripeToken) {
            throw new Error('createSubscription(member, {stripeToken}) missing stripeToken');
        }

        if (!metadata.plan) {
            throw new Error('createSubscription(member, {plan}) missing plan');
        }

        return this._ready.then(() => {
            const plan = this._plans.find(plan => plan.nickname === metadata.plan);

            if (!plan) {
                throw new Error('Unknown plan');
            }

            return api.subscriptions.create(this._stripe, member, {
                plan,
                stripeToken: metadata.stripeToken,
                coupon: metadata.coupon
            });
        });
    }

    getSubscription(member) {
        if (!this._stripe) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        return this._ready.then(() => {
            return api.subscriptions.get(this._stripe, member);
        });
    }

    removeSubscription(member) {
        if (!this._stripe) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        return this._ready.then(() => {
            return api.subscriptions.remove(this._stripe, member);
        });
    }

    removeCustomer(member) {
        if (!this._stripe) {
            throw new Error('StripePaymentProcessor must be configured()');
        }

        return this._ready.then(() => {
            return api.customers.remove(this._stripe, member);
        });
    }
};
