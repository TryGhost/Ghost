const api = require('./api');

module.exports = class StripePaymentProcessor {
    constructor() {
        this._ready = new Promise(() => {});
    }

    configure(config) {
        const stripe = require('stripe')(config.secret_token);

        this._ready = api.products.ensure(stripe, config.product).then((product) => {
            return Promise.all(
                config.plans.map(plan => api.plans.ensure(stripe, plan, product))
            ).then((plans) => {
                this._stripe = stripe;
                this._product = product;
                this._plans = plans;
                return {
                    product,
                    plans
                };
            });
        });

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
                stripeToken: metadata.stripeToken
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
};
