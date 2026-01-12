const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');
const {blogStartDate} = require('../utils/blog-info');

const sixWeeksLater = new Date(blogStartDate);
sixWeeksLater.setDate(sixWeeksLater.getDate() + (7 * 6));

class StripeProductsImporter extends TableImporter {
    static table = 'stripe_products';
    static dependencies = ['products'];

    constructor(knex, transaction) {
        super(StripeProductsImporter.table, knex, transaction);
    }

    async import() {
        const products = await this.transaction.select('id').from('products');
        await this.importForEach(products, 1);
    }

    generate() {
        return {
            id: this.fastFakeObjectId(),
            product_id: this.model.id,
            stripe_product_id: faker.datatype.hexadecimal({
                length: 64,
                prefix: ''
            }),
            created_at: faker.date.between(blogStartDate, sixWeeksLater)
        };
    }
}

module.exports = StripeProductsImporter;
