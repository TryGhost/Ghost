const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');
const {luck} = require('../utils/random');

class MembersProductsImporter extends TableImporter {
    static table = 'members_products';
    static dependencies = ['products', 'members'];

    constructor(knex, transaction) {
        super(MembersProductsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id').from('members').whereNot('status', 'free');
        this.products = await this.transaction.select('id').from('products').whereNot('name', 'Free');

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
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            product_id: this.getProduct().id,
            sort_order: 0
        };
    }
}

module.exports = MembersProductsImporter;
