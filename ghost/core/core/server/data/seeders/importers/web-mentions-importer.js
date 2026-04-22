const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class WebMentionsImporter extends TableImporter {
    static table = 'mentions';
    static dependencies = [];
    defaultQuantity = 23;

    constructor(knex, transaction, {baseUrl}) {
        super(WebMentionsImporter.table, knex, transaction);

        this.baseUrl = baseUrl;
    }

    generate() {
        const id = this.fastFakeObjectId();

        const author = `${faker.name.fullName()}`;

        // Generating only incoming recommendations for now, since we don't use webmentions for other things atm
        return {
            id,
            source: `${faker.internet.url()}/.well-known/recommendations.json`,
            source_title: faker.lorem.sentence(5),
            source_site_title: `${author}'s ${faker.word.noun()}`,
            source_excerpt: faker.lorem.paragraph(),
            source_author: author,
            source_featured_image: `https://api.dicebear.com/5.x/shapes/png?size=256&seed=${id}`,
            source_favicon: `https://api.dicebear.com/5.x/bottts/png?size=32&seed=${id}`,
            target: `${this.baseUrl}`,
            resource_id: null,
            resource_type: null,
            created_at: dateToDatabaseString(faker.date.past()),
            payload: JSON.stringify({}),
            deleted: 0,
            verified: 1
        };
    }
}

module.exports = WebMentionsImporter;
