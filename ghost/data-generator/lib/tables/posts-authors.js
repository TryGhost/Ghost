const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class PostsImporter extends TableImporter {
    constructor(knex, {users}) {
        super('posts_authors', knex);
        this.users = users;
        this.sortOrder = 0;
    }

    generate(id) {
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: faker.database.mongodbObjectId(),
            post_id: id,
            author_id: this.users[faker.datatype.number(this.users.length - 1)],
            sort_order: sortOrder
        };
    }
}

module.exports = PostsImporter;
