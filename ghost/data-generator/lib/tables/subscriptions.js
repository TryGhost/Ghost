const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const TableImporter = require('./base');
const dateToDatabaseString = require('../utils/database-date');

class SubscriptionsImporter extends TableImporter {
    static table = 'subscriptions';

    constructor(knex, {members, stripeProducts, stripePrices}) {
        super(SubscriptionsImporter.table, knex);
        this.members = members;
        this.stripeProducts = stripeProducts;
        this.stripePrices = stripePrices;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const member = this.members.find(m => m.id === this.model.member_id);
        const status = member.status;
        const billingInfo = {};
        const isMonthly = faker.datatype.boolean();
        if (status === 'paid') {
            const stripeProduct = this.stripeProducts.find(product => product.product_id === this.model.product_id);
            const stripePrice = this.stripePrices.find((price) => {
                return price.stripe_product_id === stripeProduct.stripe_product_id &&
                    (isMonthly ? price.interval === 'month' : price.interval === 'year');
            });
            billingInfo.cadence = isMonthly ? 'month' : 'year';
            billingInfo.currency = stripePrice.currency;
            billingInfo.amount = stripePrice.amount;
        }
        const [startDate] = generateEvents({
            total: 1,
            trend: 'negative',
            startTime: new Date(member.created_at),
            endTime: new Date(),
            shape: 'ease-out'
        });
        const endDate = new Date(startDate);
        if (isMonthly) {
            endDate.setMonth(new Date().getMonth());
            if (endDate < new Date()) {
                endDate.setMonth(endDate.getMonth() + 1);
            }
        } else {
            endDate.setFullYear(new Date().getFullYear());
            if (endDate < new Date()) {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
        }
        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            type: status,
            status: 'active',
            member_id: this.model.member_id,
            tier_id: this.model.product_id,
            payment_provider: 'stripe',
            expires_at: dateToDatabaseString(endDate),
            created_at: dateToDatabaseString(startDate)
        }, billingInfo);
    }
}

module.exports = SubscriptionsImporter;
