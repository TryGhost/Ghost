const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');

class MembersStripeCustomersSubscriptionsImporter extends TableImporter {
    static table = 'members_stripe_customers_subscriptions';
    static dependencies = ['subscriptions', 'members_stripe_customers', 'products', 'stripe_products', 'stripe_prices'];

    constructor(knex, transaction) {
        super(MembersStripeCustomersSubscriptionsImporter.table, knex, transaction);
    }

    async import() {
        const subscriptions = await this.transaction.select('id', 'member_id', 'tier_id', 'cadence', 'created_at', 'expires_at').from('subscriptions');
        this.membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers');
        this.products = await this.transaction.select('id', 'name').from('products');
        this.stripeProducts = await this.transaction.select('id', 'product_id', 'stripe_product_id').from('stripe_products');
        this.stripePrices = await this.transaction.select('id', 'nickname', 'stripe_product_id', 'stripe_price_id', 'amount', 'interval', 'currency').from('stripe_prices');

        await this.importForEach(subscriptions, 1);
    }

    generate() {
        const customer = this.membersStripeCustomers.find(c => this.model.member_id === c.member_id);
        const isMonthly = this.model.cadence === 'month';
        const ghostProduct = this.products.find(product => product.id === this.model.tier_id);
        const stripeProduct = this.stripeProducts.find(product => product.product_id === this.model.tier_id);
        const stripePrice = this.stripePrices.find((price) => {
            return price.stripe_product_id === stripeProduct.stripe_product_id &&
                (isMonthly ? price.interval === 'month' : price.interval === 'year');
        });
        const mrr = isMonthly ? stripePrice.amount : Math.floor(stripePrice.amount / 12);
        return {
            id: faker.database.mongodbObjectId(),
            customer_id: customer.customer_id,
            ghost_subscription_id: this.model.id,
            subscription_id: `sub_${faker.random.alphaNumeric(14)}`,
            stripe_price_id: stripePrice.stripe_price_id,
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: this.model.expires_at,
            start_date: this.model.created_at,
            created_at: this.model.created_at,
            created_by: 'unused',
            mrr,
            plan_id: stripeProduct.stripe_product_id,
            plan_nickname: `${ghostProduct.name} - ${stripePrice.nickname}`,
            plan_interval: stripePrice.interval,
            plan_amount: stripePrice.amount,
            plan_currency: stripePrice.currency
        };
    }
}

module.exports = MembersStripeCustomersSubscriptionsImporter;
