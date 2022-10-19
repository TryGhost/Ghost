const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');

class NewslettersImporter extends TableImporter {
    constructor(knex) {
        super('newsletters', knex);
        this.sortOrder = 0;
    }

    generate() {
        const name = `${faker.company.bsAdjective()} ${faker.company.bsNoun()}`;
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: faker.database.mongodbObjectId(),
            uuid: faker.datatype.uuid(),
            name: name,
            description: `${faker.company.bs()}`,
            slug: slugify(name),
            sender_reply_to: 'hello@example.com',
            status: 'active',
            subscribe_on_signup: faker.datatype.boolean(),
            sort_order: sortOrder,
            created_at: faker.date.between(new Date(2016, 0), new Date())
        };
    }
}

module.exports = NewslettersImporter;
