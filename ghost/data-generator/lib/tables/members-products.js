const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');
const {luck} = require('../utils/random');

class MembersProductsImporter extends TableImporter {
    constructor(knex, {products}) {
        super('members_products', knex);
        this.products = products;
    }

    setImportOptions({model}) {
        this.model = model;
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
