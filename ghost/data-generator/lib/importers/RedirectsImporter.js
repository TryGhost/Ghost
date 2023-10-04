const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');

class RedirectsImporter extends TableImporter {
    static table = 'redirects';
    static dependencies = ['posts'];

    constructor(knex, transaction) {
        super(RedirectsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const posts = await this.transaction
            .select('id', 'published_at')
            .from('posts')
            .where('type', 'post')
            .andWhere('status', 'published');

        this.quantity = quantity ? quantity / posts.length : 10;
        await this.importForEach(posts, this.quantity);
    }

    setReferencedModel(model) {
        this.model = model;

        // Reset the amount for each model
        this.amount = faker.datatype.number({
            min: 0,
            max: this.quantity
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
