const TableImporter = require('./table-importer');

class PostsProductsImporter extends TableImporter {
    static table = 'posts_products';
    static dependencies = ['posts', 'products'];

    constructor(knex, transaction) {
        super(PostsProductsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const posts = await this.transaction.select('id').from('posts').where('type', 'post');
        this.products = await this.transaction.select('id').from('products');

        await this.importForEach(posts, quantity ? quantity / posts.length : 1);
    }

    setReferencedModel(model) {
        this.model = model;
        this.sortOrder = 0;
    }

    generate() {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: this.fastFakeObjectId(),
            post_id: this.model.id,
            product_id: this.products[sortOrder].id,
            sort_order: this.sortOrder
        };
    }
}

module.exports = PostsProductsImporter;
