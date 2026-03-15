const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');

class ProductsImporter extends TableImporter {
    static table = 'products';
    static dependencies = [];
    defaultQuantity = 4;

    constructor(knex, transaction) {
        super(ProductsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        // TODO: Add random products if quantity != 4
        this.names = ['Free', 'Bronze', 'Silver', 'Gold'].reverse();
        this.count = 0;

        await super.import(quantity);
    }

    /**
     * Add the stripe products / prices
     */
    async finalise() {
        const stripeProducts = await this.transaction.select('id', 'product_id', 'stripe_product_id').from('stripe_products');
        const stripePrices = await this.transaction.select('id', 'stripe_product_id', 'interval').from('stripe_prices');

        const products = await this.transaction.select('id').from('products');

        for (const {id} of products) {
            const stripeProduct = stripeProducts.find(p => id === p.product_id);
            if (!stripeProduct) {
                // Free product
                continue;
            }
            const monthlyPrice = stripePrices.find((p) => {
                return p.stripe_product_id === stripeProduct.stripe_product_id &&
                    p.interval === 'monthly';
            });
            const yearlyPrice = stripePrices.find((p) => {
                return p.stripe_product_id === stripeProduct.stripe_product_id &&
                    p.interval === 'yearly';
            });

            const update = {};
            if (monthlyPrice) {
                update.monthly_price_id = monthlyPrice.id;
            }
            if (yearlyPrice) {
                update.yearly_price_id = yearlyPrice.id;
            }

            if (Object.keys(update).length > 0) {
                await this.transaction('products').update(update).where({
                    id
                });
            }
        }
    }

    generate() {
        const name = this.names.pop();
        const count = this.count;
        this.count = this.count + 1;
        const sixMonthsLater = new Date(blogStartDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        const tierInfo = {
            type: 'free',
            description: 'A free sample of content'
        };
        if (count !== 0) {
            tierInfo.type = 'paid';
            tierInfo.description = `${name} tier member`;
            tierInfo.currency = 'USD';
            tierInfo.monthly_price = count * 500;
            tierInfo.yearly_price = count * 5000;
        }
        return Object.assign({}, {
            id: this.fastFakeObjectId(),
            name: name,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            visibility: 'public',
            created_at: faker.date.between(blogStartDate, sixMonthsLater)
        }, tierInfo);
    }
}

module.exports = ProductsImporter;
