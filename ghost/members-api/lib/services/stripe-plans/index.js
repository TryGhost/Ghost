/**
 * @typedef {'usd'|'aud'|'cad'|'gbp'|'eur'|'inr'} Currency
 */

module.exports = class StripeService {
    /**
     * @param {object} deps
     * @param {import('../stripe-api')} deps.stripeAPIService
     */
    constructor({
        stripeAPIService
    }) {
        this._stripeAPIService = stripeAPIService;
        this._configured = false;
        /** @type {import('stripe').products.IProduct} */
        this._product = null;
        /** @type {import('stripe').plans.IPlan[]} */
        this._plans = null;
    }

    /**
     * @returns {import('stripe').products.IProduct}
     */
    getProduct() {
        if (!this._configured) {
            throw new Error('StripeService has not been configured');
        }
        return this._product;
    }

    /**
     * @returns {import('stripe').plans.IPlan[]}
     */
    getPlans() {
        if (!this._configured) {
            throw new Error('StripeService has not been configured');
        }
        return this._plans;
    }

    /**
     * @param {string} nickname
     * @returns {import('stripe').plans.IPlan}
     */
    getPlan(nickname) {
        if (!this._configured) {
            throw new Error('StripeService has not been configured');
        }
        return this.getPlans().find((plan) => {
            return plan.nickname.toLowerCase() === nickname.toLowerCase();
        });
    }

    /**
     * @param {Currency} currency
     * @returns {import('stripe').plans.IPlan}
     */
    getComplimentaryPlan(currency) {
        if (!this._configured) {
            throw new Error('StripeService has not been configured');
        }
        return this.getPlans().find((plan) => {
            return plan.nickname.toLowerCase() === 'complimentary' && plan.currency === currency;
        });
    }

    /**
     * @param {object} config
     * @param {object} config.product - The name for the product
     * @param {string} config.product.name - The name for the product
     *
     * @param {object[]} config.plans
     * @param {string} config.plans[].name
     * @param {Currency} config.plans[].currency
     * @param {'year'|'month'} config.plans[].interval
     * @param {string} config.plans[].amount
     *
     * @returns {Promise<void>}
     */
    async configure(config) {
        if (config.mode !== 'production' && this._stripeAPIService.mode === 'live') {
            const error = new Error('Cannot use live Stripe keys in development mode. Please restart in production mode.');
            error.fatal = true;
            throw error;
        }
        try {
            const product = await this._stripeAPIService.ensureProduct(config.product.name);
            this._product = product;

            this._plans = [];
            for (const planSpec of config.plans) {
                const plan = await this._stripeAPIService.ensurePlan(planSpec, product);
                this._plans.push(plan);
            }
            this._configured = true;
        } catch (err) {
            console.log(err);
        }
    }
};
