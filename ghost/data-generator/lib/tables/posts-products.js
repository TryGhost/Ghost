const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class PostsProductsImporter extends TableImporter {
    constructor(knex, {products}) {
        super('posts_products', knex);
        this.products = products;
    }

    setImportOptions({model}) {
        this.sortOrder = 0;
        this.model = model;
    }

    generate() {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: faker.database.mongodbObjectId(),
            post_id: this.model.id,
            product_id: this.products[sortOrder].id,
            sort_order: this.sortOrder
        };
    }
}

module.exports = PostsProductsImporter;
