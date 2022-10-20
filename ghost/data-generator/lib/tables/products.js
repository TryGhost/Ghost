const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');

class ProductsImporter extends TableImporter {
    constructor(knex) {
        super('products', knex);
    }

    setImportOptions() {
        this.names = ['Bronze', 'Silver', 'Gold'];
    }

    generate() {
        const name = this.names.shift();
        const sixMonthsLater = new Date(blogStartDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        return {
            id: faker.database.mongodbObjectId(),
            name: name,
            description: `${name} star member`,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            visibility: 'public',
            created_at: faker.date.between(blogStartDate, sixMonthsLater)
        };
    }
}

module.exports = ProductsImporter;
