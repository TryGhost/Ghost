const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');

class PostsAuthorsImporter extends TableImporter {
    static table = 'posts_authors';
    static dependencies = ['posts', 'users'];

    constructor(knex, transaction) {
        super(PostsAuthorsImporter.table, knex, transaction);
        this.sortOrder = 0;
    }

    async import(quantity) {
        const posts = await this.transaction.select('id').from('posts');
        this.users = await this.transaction.select('id').from('users');

        await this.importForEach(posts, quantity ? quantity / posts.length : 1);
    }

    generate() {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: this.fastFakeObjectId(),
            post_id: this.model.id,
            author_id: this.users[faker.datatype.number(this.users.length - 1)].id,
            sort_order: sortOrder
        };
    }
}

module.exports = PostsAuthorsImporter;
