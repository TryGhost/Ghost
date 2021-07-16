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

        if (subscriptions.length > 0 && products.length === 0 && prices.length === 0 && defaultProduct) {
            try {
                this._logging.info(`Populating products and prices for existing stripe customers`);
                const uniquePlans = _.uniq(subscriptions.map(d => _.get(d, 'plan.id')));

                let stripePrices = [];
                for (const plan of uniquePlans) {
                    try {
                        const stripePrice = await this._stripeAPIService.getPrice(plan, {
                            expand: ['product']
                        });
                        stripePrices.push(stripePrice);
                    } catch (err) {
                        if (err && err.statusCode === 404) {
                            this._logging.warn(`Plan ${plan} not found on Stripe - ignoring`);
                        } else {
                            throw err;
                        }
                    }
                }
                this._logging.info(`Adding ${stripePrices.length} prices from Stripe`);
                for (const stripePrice of stripePrices) {
                    // We expanded the product when fetching this price.
                    /** @type {import('stripe').Stripe.Product} */
                    const stripeProduct = (stripePrice.product);

                    await this._StripeProduct.upsert({
                        product_id: defaultProduct.id,
                        stripe_product_id: stripeProduct.id
                    });

                    await this._StripePrice.add({
                        stripe_price_id: stripePrice.id,
                        stripe_product_id: stripeProduct.id,
                        active: stripePrice.active,
                        nickname: stripePrice.nickname,
                        currency: stripePrice.currency,
                        amount: stripePrice.unit_amount,
                        type: 'recurring',
                        interval: stripePrice.recurring.interval
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

    async getPlanFromPrice(priceId) {
        const price = await this._StripePrice.findOne({
            id: priceId
        });

        if (price && price.get('interval') === 'month') {
            return 'monthly';
        }
        if (price && price.get('interval') === 'year') {
            return 'yearly';
        }
        return null;
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

    async populateMembersMonthlyPriceIdSettings() {
        this._logging.info('Populating members_monthly_price_id from stripe_plans');
        const monthlyPriceId = await this._Settings.findOne({key: 'members_monthly_price_id'});

        if (monthlyPriceId.get('value')) {
            this._logging.info('Skipping population of members_monthly_price_id, already populated');
            return;
        }

        const stripePlans = await this._Settings.findOne({key: 'stripe_plans'});
        let plans;
        try {
            plans = JSON.parse(stripePlans.get('value'));
        } catch (err) {
            this._logging.warn('Skipping population of members_monthly_price_id, could not parse stripe_plans');
            return;
        }

        const monthlyPlan = plans.find((plan) => {
            return plan.name === 'Monthly';
        });

        if (!monthlyPlan) {
            this._logging.warn('Skipping population of members_monthly_price_id, could not find Monthly plan');
            return;
        }

        let monthlyPrice;

        monthlyPrice = await this._StripePrice.findOne({
            amount: monthlyPlan.amount,
            currency: monthlyPlan.currency,
            interval: monthlyPlan.interval,
            active: true
        });

        if (!monthlyPrice) {
            this._logging.info('Could not find active Monthly price from stripe_plans - searching by interval');
            monthlyPrice = await this._StripePrice.where('amount', '>', 0)
                .where({interval: 'month', active: true}).fetch();
        }

        if (!monthlyPrice) {
            this._logging.info('Could not any active Monthly price - creating a new one');
            let defaultStripeProduct;
            const stripeProductsPage = await this._StripeProduct.findPage({limit: 1});
            defaultStripeProduct = stripeProductsPage.data[0];
            const price = await this._stripeAPIService.createPrice({
                currency: 'usd',
                amount: 5000,
                nickname: 'Monthly',
                interval: 'month',
                active: true,
                type: 'recurring',
                product: defaultStripeProduct.get('stripe_product_id')
            });

            monthlyPrice = await this._StripePrice.add({
                stripe_price_id: price.id,
                stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                active: price.active,
                nickname: price.nickname,
                currency: price.currency,
                amount: price.unit_amount,
                type: 'recurring',
                interval: price.recurring.interval
            });
        }

        await this._Settings.edit({key: 'members_monthly_price_id', value: monthlyPrice.id}, {id: monthlyPriceId.id});
    }

    async populateMembersYearlyPriceIdSettings() {
        this._logging.info('Populating members_yearly_price_id from stripe_plans');
        const yearlyPriceId = await this._Settings.findOne({key: 'members_yearly_price_id'});

        if (yearlyPriceId.get('value')) {
            this._logging.info('Skipping population of members_yearly_price_id, already populated');
            return;
        }

        const stripePlans = await this._Settings.findOne({key: 'stripe_plans'});
        let plans;
        try {
            plans = JSON.parse(stripePlans.get('value'));
        } catch (err) {
            this._logging.warn('Skipping population of members_yearly_price_id, could not parse stripe_plans');
        }

        const yearlyPlan = plans.find((plan) => {
            return plan.name === 'Yearly';
        });

        if (!yearlyPlan) {
            this._logging.warn('Skipping population of members_yearly_price_id, could not find yearly plan');
            return;
        }

        let yearlyPrice;

        yearlyPrice = await this._StripePrice.findOne({
            amount: yearlyPlan.amount,
            currency: yearlyPlan.currency,
            interval: yearlyPlan.interval,
            active: true
        });

        if (!yearlyPrice) {
            this._logging.info('Could not find active yearly price from stripe_plans - searching by interval');
            yearlyPrice = await this._StripePrice.where('amount', '>', 0)
                .where({interval: 'year', active: true}).fetch();
        }

        if (!yearlyPrice) {
            this._logging.info('Could not any active yearly price - creating a new one');
            let defaultStripeProduct;
            const stripeProductsPage = await this._StripeProduct.findPage({limit: 1});
            defaultStripeProduct = stripeProductsPage.data[0];
            const price = await this._stripeAPIService.createPrice({
                currency: 'usd',
                amount: 500,
                nickname: 'Yearly',
                interval: 'year',
                active: true,
                type: 'recurring',
                product: defaultStripeProduct.get('stripe_product_id')
            });

            yearlyPrice = await this._StripePrice.add({
                stripe_price_id: price.id,
                stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                active: price.active,
                nickname: price.nickname,
                currency: price.currency,
                amount: price.unit_amount,
                type: 'recurring',
                interval: price.recurring.interval
            });
        }

        await this._Settings.edit({key: 'members_yearly_price_id', value: yearlyPrice.id}, {id: yearlyPriceId.id});
    }

    async populateDefaultProductMonthlyPriceId() {
        this._logging.info('Migrating members_monthly_price_id setting to monthly_price_id column');
        const productsPage = await this._Product.findPage({limit: 1});
        const defaultProduct = productsPage.data[0];

        if (defaultProduct.get('monthly_price_id')) {
            this._logging.warn('Skipping migration, monthly_price_id already set');
            return;
        }

        const monthlyPriceIdSetting = await this._Settings.findOne({key: 'members_monthly_price_id'});
        const monthlyPriceId = monthlyPriceIdSetting.get('value');

        await this._Product.edit({monthly_price_id: monthlyPriceId}, {id: defaultProduct.id});
    }

    async populateDefaultProductYearlyPriceId() {
        this._logging.info('Migrating members_yearly_price_id setting to yearly_price_id column');
        const productsPage = await this._Product.findPage({limit: 1});
        const defaultProduct = productsPage.data[0];

        if (defaultProduct.get('yearly_price_id')) {
            this._logging.warn('Skipping migration, yearly_price_id already set');
            return;
        }

        const yearlyPriceIdSetting = await this._Settings.findOne({key: 'members_yearly_price_id'});
        const yearlyPriceId = yearlyPriceIdSetting.get('value');

        await this._Product.edit({yearly_price_id: yearlyPriceId}, {id: defaultProduct.id});
    }

    async revertPortalPlansSetting() {
        this._logging.info('Migrating portal_plans setting from ids to names');
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

        const containsNamedValues = !!portalPlans.find((plan) => {
            return ['monthly', 'yearly'].includes(plan);
        });

        if (containsNamedValues) {
            this._logging.info('The portal_plans setting already contains names, skipping migration');
            return;
        }
        const portalPlanIds = portalPlans.filter((plan) => {
            return plan !== 'free';
        });

        if (portalPlanIds.length === 0) {
            this._logging.info('No price ids found in portal_plans setting, skipping migration');
            return;
        }
        const defaultPortalPlans = portalPlans.filter((plan) => {
            return plan === 'free';
        });

        const newPortalPlans = await portalPlanIds.reduce(async (newPortalPlansPromise, priceId) => {
            const plan = await this.getPlanFromPrice(priceId);

            if (!plan) {
                return newPortalPlansPromise;
            }

            const newPortalPlans = await newPortalPlansPromise;
            const updatedPortalPlans = newPortalPlans.filter(d => d !== plan).concat(plan);

            return updatedPortalPlans;
        }, defaultPortalPlans);
        this._logging.info(`Updating portal_plans setting to ${JSON.stringify(newPortalPlans)}`);
        await this._Settings.edit({
            key: 'portal_plans',
            value: JSON.stringify(newPortalPlans)
        }, {
            id: portalPlansSetting.id
        });
    }

    async removeInvalidSubscriptions() {
        const subscriptionModels = await this._StripeCustomerSubscription.findAll({
            withRelated: ['stripePrice']
        });
        const invalidSubscriptions = subscriptionModels.filter((sub) => {
            return !sub.toJSON().price;
        });
        if (invalidSubscriptions.length > 0) {
            this._logging.warn(`Deleting ${invalidSubscriptions.length} invalid subscription(s)`);
            for (let sub of invalidSubscriptions) {
                this._logging.warn(`Deleting subscription - ${sub.id} - no price found`);
                await sub.destroy();
            }
        } else {
            this._logging.info(`No invalid subscriptions, skipping migration`);
        }
    }
};
