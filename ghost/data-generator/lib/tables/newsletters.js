const TableImporter = require('./base');
const {blogStartDate} = require('../utils/blog-info');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');

class NewslettersImporter extends TableImporter {
    constructor(knex) {
        super('newsletters', knex);
        this.sortOrder = 0;
        this.names = ['Occasional freebie', 'Regular premium'];
    }

    generate() {
        const name = this.names.shift();
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        const weekAfter = new Date(blogStartDate);
        weekAfter.setDate(weekAfter.getDate() + 7);
        return {
            id: faker.database.mongodbObjectId(),
            uuid: faker.datatype.uuid(),
            name: name,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            sender_reply_to: 'hello@example.com',
            status: 'active',
            subscribe_on_signup: faker.datatype.boolean(),
            sort_order: sortOrder,
            created_at: faker.date.between(blogStartDate, weekAfter)
        };
    }
}

module.exports = NewslettersImporter;
