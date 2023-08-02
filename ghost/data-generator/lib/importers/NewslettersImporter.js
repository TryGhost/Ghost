const TableImporter = require('./TableImporter');
const {blogStartDate} = require('../utils/blog-info');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');

class NewslettersImporter extends TableImporter {
    static table = 'newsletters';
    static dependencies = [];
    defaultQuantity = 2;

    constructor(knex, transaction) {
        super(NewslettersImporter.table, knex, transaction);
        this.sortOrder = 0;
        // TODO: Use random names if we ever need more than 2 newsletters
        this.names = ['Regular premium', 'Occasional freebie'];
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
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: faker.datatype.boolean(),
            sort_order: sortOrder,
            created_at: faker.date.between(blogStartDate, weekAfter)
        };
    }
}

module.exports = NewslettersImporter;
