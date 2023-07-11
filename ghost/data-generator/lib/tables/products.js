const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');

class ProductsImporter extends TableImporter {
    static table = 'products';

    constructor(knex) {
        super(ProductsImporter.table, knex);
    }

    setImportOptions() {
        this.names = ['Free', 'Bronze', 'Silver', 'Gold'];
        this.count = 0;
    }

    async addStripePrices({products, stripeProducts, stripePrices}) {
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
                await this.knex('products').update(update).where({
                    id
                });
            }
        }
    }

    generate() {
        const name = this.names.shift();
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
            tierInfo.description = `${name} star member`;
            tierInfo.currency = 'USD';
            tierInfo.monthly_price = count * 500;
            tierInfo.yearly_price = count * 5000;
        }
        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            name: name,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            visibility: 'public',
            created_at: faker.date.between(blogStartDate, sixMonthsLater)
        }, tierInfo);
    }
}

module.exports = ProductsImporter;
