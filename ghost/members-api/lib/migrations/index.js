const _ = require('lodash');

/**
 * @typedef {object} ILogger
 * @prop {(x: any) => void} error
 * @prop {(x: any) => void} info
 * @prop {(x: any) => void} warn
 */
module.exports = class StripeMigrations {
    /**
     * StripeMigrations
     *
     * @param {object} params
     *
     * @param {ILogger} params.logger
     * @param {any} params.StripeCustomerSubscription
     * @param {any} params.StripeProduct
     * @param {any} params.StripePrice
     * @param {any} params.Product
     * @param {any} params.Settings
     * @param {import('../services/stripe-api')} params.stripeAPIService
     */
    constructor({
        StripeCustomerSubscription,
        StripeProduct,
        StripePrice,
        Product,
        Settings,
        stripeAPIService,
        logger
    }) {
        this._logging = logger;
        this._StripeCustomerSubscription = StripeCustomerSubscription;
        this._StripeProduct = StripeProduct;
        this._StripePrice = StripePrice;
        this._Product = Product;
        this._Settings = Settings;
        this._stripeAPIService = stripeAPIService;
    }

    async populateProductsAndPrices() {
        const subscriptionModels = await this._StripeCustomerSubscription.findAll();
        const priceModels = await this._StripePrice.findAll();
        const productModels = await this._StripeProduct.findAll();
        const subscriptions = subscriptionModels.toJSON();
        const prices = priceModels.toJSON();
        const products = productModels.toJSON();
        const {data} = await this._Product.findPage({
            limit: 1
        });
        const defaultProduct = data[0] && data[0].toJSON();

        /** Only run when -
         * No rows in stripe_products,
         * No rows in stripe_prices,
         * One or more rows in members_stripe_customers_subscriptions
         * */
        if (subscriptions.length > 0 && products.length === 0 && prices.length === 0 && defaultProduct) {
            try {
                this._logging.info(`Populating products and prices for existing stripe customers`);
                const uniquePlans = _.uniq(subscriptions.map(d => _.get(d, 'plan.id')));

                let stripePlans = [];
                for (const plan of uniquePlans) {
                    try {
                        const stripePlan = await this._stripeAPIService.getPlan(plan, {
                            expand: ['product']
                        });
                        stripePlans.push(stripePlan);
                    } catch (err) {
                        if (err && err.statusCode === 404) {
                            this._logging.warn(`Plan ${plan} not found on Stripe - ignoring`);
                        } else {
                            throw err;
                        }
                    }
                }
                this._logging.info(`Adding ${stripePlans.length} plans from Stripe`);
                for (const stripePlan of stripePlans) {
                    const stripeProduct = stripePlan.product;

                    await this._StripeProduct.upsert({
                        product_id: defaultProduct.id,
                        stripe_product_id: stripeProduct.id
                    });

                    await this._StripePrice.add({
                        stripe_price_id: stripePlan.id,
                        stripe_product_id: stripeProduct.id,
                        active: stripePlan.active,
                        nickname: stripePlan.nickname,
                        currency: stripePlan.currency,
                        amount: stripePlan.amount,
                        type: 'recurring',
                        interval: stripePlan.interval
                    });
                }
            } catch (e) {
                this._logging.error(`Failed to populate products/prices from stripe`);
                this._logging.error(e);
            }
        }
    }

    async findPriceByPlan(plan) {
        const currency = plan.currency ? plan.currency.toLowerCase() : 'usd';
        const amount = Number.isInteger(plan.amount) ? plan.amount : parseInt(plan.amount);
        const interval = plan.interval;

        const price = await this._StripePrice.findOne({
            currency,
            amount,
            interval
        });

        return price;
    }

    async populateStripePricesFromStripePlansSetting(plans) {
        if (!plans) {
            this._logging.info('Skipping stripe_plans -> stripe_prices migration');
            return;
        }
        let defaultStripeProduct;
        const stripeProductsPage = await this._StripeProduct.findPage({limit: 1});
        defaultStripeProduct = stripeProductsPage.data[0];

        if (!defaultStripeProduct) {
            this._logging.info('Could not find Stripe Product - creating one');
            const productsPage = await this._Product.findPage({limit: 1});
            const defaultProduct = productsPage.data[0];
            const stripeProduct = await this._stripeAPIService.createProduct({
                name: defaultProduct.get('name')
            });
            if (!defaultProduct) {
                this._logging.error('Could not find Product - skipping stripe_plans -> stripe_prices migration');
                return;
            }
            defaultStripeProduct = await this._StripeProduct.add({
                product_id: defaultProduct.id,
                stripe_product_id: stripeProduct.id
            });
        }

        for (const plan of plans) {
            const price = await this.findPriceByPlan(plan);

            if (!price) {
                this._logging.info(`Could not find Stripe Price ${JSON.stringify(plan)}`);

                try {
                    this._logging.info(`Creating Stripe Price ${JSON.stringify(plan)}`);
                    const price = await this._stripeAPIService.createPrice({
                        currency: plan.currency,
                        amount: plan.amount,
                        nickname: plan.name,
                        interval: plan.interval,
                        active: true,
                        type: 'recurring',
                        product: defaultStripeProduct.get('stripe_product_id')
                    });

                    await this._StripePrice.add({
                        stripe_price_id: price.id,
                        stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                        active: price.active,
                        nickname: price.nickname,
                        currency: price.currency,
                        amount: price.unit_amount,
                        type: 'recurring',
                        interval: price.recurring.interval
                    });
                } catch (err) {
                    this._logging.error({err, message: 'Adding price failed'});
                }
            }
        }
    }

    async updatePortalPlansSetting(plans) {
        this._logging.info('Migrating portal_plans setting from names to ids');
        const portalPlansSetting = await this._Settings.findOne({key: 'portal_plans'});

        let portalPlans;
        try {
            portalPlans = JSON.parse(portalPlansSetting.get('value'));
        } catch (err) {
            this._logging.error({
                message: 'Could not parse portal_plans setting, skipping migration',
                err
            });
            return;
        }

        const containsOldValues = !!portalPlans.find((plan) => {
            return ['monthly', 'yearly'].includes(plan);
        });

        if (!containsOldValues) {
            this._logging.info('Could not find names in portal_plans setting, skipping migration');
            return;
        }

        const newPortalPlans = await portalPlans.reduce(async (newPortalPlansPromise, plan) => {
            let newPlan = plan;
            if (plan === 'monthly') {
                const monthlyPlan = plans.find((plan) => {
                    return plan.name === 'Monthly';
                });
                if (!monthlyPlan) {
                    return newPortalPlansPromise;
                }
                const price = await this.findPriceByPlan(monthlyPlan);
                newPlan = price.id;
            }
            if (plan === 'yearly') {
                const yearlyPlan = plans.find((plan) => {
                    return plan.name === 'Yearly';
                });
                if (!yearlyPlan) {
                    return newPortalPlansPromise;
                }
                const price = await this.findPriceByPlan(yearlyPlan);
                newPlan = price.id;
            }
            const newPortalPlans = await newPortalPlansPromise;
            return newPortalPlans.concat(newPlan);
        }, []);

        this._logging.info(`Updating portal_plans setting to ${JSON.stringify(newPortalPlans)}`);
        await this._Settings.edit({
            key: 'portal_plans',
            value: JSON.stringify(newPortalPlans)
        }, {
            id: portalPlansSetting.id
        });
    }
};
