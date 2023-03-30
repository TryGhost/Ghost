const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');

class RedirectsImporter extends TableImporter {
    static table = 'redirects';

    constructor(knex) {
        super(RedirectsImporter.table, knex);
    }

    setImportOptions({model, amount}) {
        this.model = model;
        this.amount = faker.datatype.number({
            min: 1,
            max: amount
        });
    }

    generate() {
        if (this.amount <= 0) {
            return;
        }
        this.amount -= 1;
        return {
            id: faker.database.mongodbObjectId(),
            from: `/r/${faker.datatype.hexadecimal({length: 32, prefix: '', case: 'lower'})}`,
            to: `${faker.internet.url()}/${faker.helpers.slugify(`${faker.word.adjective()} ${faker.word.noun()}`).toLowerCase()}`,
            post_id: this.model.id,
            created_at: this.model.published_at,
            updated_at: this.model.published_at
        };
    }
}

module.exports = RedirectsImporter;
