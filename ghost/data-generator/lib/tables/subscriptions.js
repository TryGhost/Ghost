const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class SubscriptionsImporter extends TableImporter {
    constructor(knex, {members, stripeProducts, stripePrices}) {
        super('subscriptions', knex);
        this.members = members;
        this.stripeProducts = stripeProducts;
        this.stripePrices = stripePrices;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const status = this.members.find(member => member.id === this.model.member_id).status;
        const billingInfo = {};
        const isMonthly = faker.datatype.boolean();
        if (status === 'paid') {
            const stripeProduct = this.stripeProducts.find(product => product.product_id === this.model.product_id);
            const stripePrice = this.stripePrices.find((price) => {
                return price.stripe_product_id === stripeProduct.stripe_product_id &&
                    (isMonthly ? price.interval === 'monthly' : price.interval === 'yearly');
            });
            billingInfo.cadence = isMonthly ? 'month' : 'year';
            billingInfo.currency = stripePrice.currency;
            billingInfo.amount = stripePrice.amount;
        }
        const yearAgo = new Date();
        yearAgo.setDate(yearAgo.getDate() - 365);
        let startDate = faker.date.between(yearAgo, new Date());
        let expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + 365);
        if (isMonthly) {
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            startDate = faker.date.between(monthAgo, new Date());
            expiryDate = new Date(startDate);
            expiryDate.setDate(expiryDate.getDate() + 30);
        }
        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            type: status,
            status: 'active',
            member_id: this.model.member_id,
            tier_id: this.model.product_id,
            payment_provider: 'stripe',
            expires_at: expiryDate,
            created_at: startDate
        }, billingInfo);
    }
}

module.exports = SubscriptionsImporter;
