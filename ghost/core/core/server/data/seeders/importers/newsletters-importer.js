const TableImporter = require('./table-importer');
const {blogStartDate} = require('../utils/blog-info');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');

class NewslettersImporter extends TableImporter {
    static table = 'newsletters';
    static dependencies = [];

    defaultQuantity = 2;

    sortOrder = 0;

    constructor(knex, transaction) {
        super(NewslettersImporter.table, knex, transaction);
    }

    generate() {
        const name = `${faker.commerce.productAdjective()} ${faker.word.noun()}`;
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;

        const weekAfter = new Date(blogStartDate);
        weekAfter.setDate(weekAfter.getDate() + 7);

        return {
            id: this.fastFakeObjectId(),
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
