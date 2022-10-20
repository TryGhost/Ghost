const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');
const {luck} = require('../utils/random');

class MembersProductsImporter extends TableImporter {
    constructor(knex, {products}) {
        super('members_products', knex);
        this.products = products;
    }

    // eslint-disable-next-line no-unused-vars
    setImportOptions({amount: _amount, model}) {
        this.model = model;
    }

    generate() {
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            product_id: luck(10) ? this.products[2].id // Gold
                : luck(50) ? this.products[1].id // Silver
                    : this.products[0].id, // Bronze
            sort_order: 0
        };
    }
}

module.exports = MembersProductsImporter;
