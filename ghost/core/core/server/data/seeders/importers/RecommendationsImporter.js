const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

class RecommendationsImporter extends TableImporter {
    static table = 'recommendations';
    static dependencies = [];
    defaultQuantity = 15;

    constructor(knex, transaction) {
        super(RecommendationsImporter.table, knex, transaction);
    }

    generate() {
        const id = this.fastFakeObjectId();
        return {
            id,
            url: faker.internet.url(),
            title: capitalize(`${faker.word.adjective()} ${faker.word.noun()}`),
            excerpt: faker.lorem.sentence(),
            featured_image: `https://api.dicebear.com/5.x/shapes/png?size=256&seed=${id}`,
            favicon: `https://api.dicebear.com/5.x/shapes/png?size=32&seed=${id}`,
            description: faker.lorem.sentence(),
            one_click_subscribe: faker.datatype.boolean(),
            created_at: faker.date.past(),
            updated_at: faker.date.past()
        };
    }
}

module.exports = RecommendationsImporter;
