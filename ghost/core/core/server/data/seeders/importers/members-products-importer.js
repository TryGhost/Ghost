const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersProductsImporter extends TableImporter {
    static table = 'members_products';
    static dependencies = ['products', 'members'];

    constructor(knex, transaction) {
        super(MembersProductsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id').from('members').whereNot('status', 'free');
        this.products = await this.transaction.select('id').from('products').whereNot('type', 'fee');

        await this.importForEach(members, quantity ? quantity / members.length : 1);
    }

    getProduct() {
        if (this.products.length > 1) {
            return luck(10) ? this.products[2]
                : luck(50) ? this.products[1]
                    : this.products[0];
        } else {
            return this.products[0];
        }
    }

    generate() {
        return {
            id: this.fastFakeObjectId(),
            member_id: this.model.id,
            product_id: this.getProduct().id,
            sort_order: 0,
            expiry_at: this.model.status === 'paid' ? null : (luck(50) ? null : dateToDatabaseString(faker.date.future()))
        };
    }
}

module.exports = MembersProductsImporter;
