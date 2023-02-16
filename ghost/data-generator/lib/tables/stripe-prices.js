const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');
const {blogStartDate} = require('../utils/blog-info');

class StripePricesImporter extends TableImporter {
    static table = 'stripe_prices';

    constructor(knex, {products}) {
        super(StripePricesImporter.table, knex);
        this.products = products;
    }

    setImportOptions({model}) {
        this.model = model;

        this.count = 0;
    }

    generate() {
        const sixWeeksLater = new Date(blogStartDate);
        sixWeeksLater.setDate(sixWeeksLater.getDate() + (7 * 6));

        const count = this.count;
        this.count = this.count + 1;

        const relatedProduct = this.products.find(product => product.id === this.model.product_id);

        if (count === 1 && relatedProduct.monthly_price === null) {
            // Only single complimentary price (yearly)
            return null;
        }

        const billingCycle = {
            nickname: 'Monthly',
            interval: 'month',
            type: 'recurring',
            currency: 'usd',
            amount: relatedProduct.monthly_price
        };
        if (count === 1) {
            billingCycle.nickname = 'Yearly';
            billingCycle.interval = 'year';
            billingCycle.amount = relatedProduct.yearly_price;
        } else if (relatedProduct.monthly_price === null) {
            billingCycle.nickname = 'Complimentary';
            billingCycle.interval = 'year';
            billingCycle.amount = 0;
        }

        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            stripe_price_id: faker.datatype.hexadecimal({
                length: 64,
                prefix: ''
            }),
            stripe_product_id: this.model.stripe_product_id,
            active: true,
            created_at: faker.date.between(blogStartDate, sixWeeksLater)
        }, billingCycle);
    }
}

module.exports = StripePricesImporter;
