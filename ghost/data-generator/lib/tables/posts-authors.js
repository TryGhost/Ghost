const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class PostsAuthorsImporter extends TableImporter {
    static table = 'posts_authors';

    constructor(knex, {users}) {
        super(PostsAuthorsImporter.table, knex);
        this.users = users;
        this.sortOrder = 0;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: faker.database.mongodbObjectId(),
            post_id: this.model.id,
            author_id: this.users[faker.datatype.number(this.users.length - 1)].id,
            sort_order: sortOrder
        };
    }
}

module.exports = PostsAuthorsImporter;
