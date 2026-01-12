const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');
const {blogStartDate} = require('../utils/blog-info');

const sixWeeksLater = new Date(blogStartDate);
sixWeeksLater.setDate(sixWeeksLater.getDate() + (7 * 6));

class StripePricesImporter extends TableImporter {
    static table = 'stripe_prices';
    static dependencies = ['products', 'stripe_products'];

    constructor(knex, transaction) {
        super(StripePricesImporter.table, knex, transaction);
    }

    async import() {
        const stripeProducts = await this.transaction.select('id', 'stripe_product_id', 'product_id').from('stripe_products');
        this.products = await this.transaction.select('id', 'monthly_price', 'yearly_price').from('products');

        await this.importForEach(stripeProducts, 2);
    }

    setReferencedModel(model) {
        this.model = model;
        this.count = 0;
    }

    generate() {
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
            id: this.fastFakeObjectId(),
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
