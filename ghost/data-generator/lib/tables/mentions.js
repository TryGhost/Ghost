const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class WebMentionsImporter extends TableImporter {
    static table = 'mentions';

    constructor(knex, {baseUrl}) {
        super(WebMentionsImporter.table, knex);

        this.baseUrl = baseUrl;
    }

    setImportOptions({model, amount}) {
        this.model = model;

        // Most web mentions published soon after publication date
        const startDate = new Date(this.model.published_at);
        // End date should be either 1 year after post is published, or current date, whichever is first
        const endDate = new Date(Math.min(new Date().valueOf(), new Date(startDate).setFullYear(startDate.getFullYear() + 1)));
        this.timestamps = generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            total: amount,
            startTime: startDate,
            endTime: endDate
        }).sort();
    }

    generate() {
        if (luck(50)) {
            // 50/50 chance of having a web mention
            return null;
        }

        const id = faker.database.mongodbObjectId();
        const timestamp = this.timestamps.shift();

        const author = `${faker.name.fullName()}`;
        return {
            id,
            source: `${faker.internet.url()}/${faker.helpers.slugify(`${faker.word.adjective()} ${faker.word.noun()}`).toLowerCase()}`,
            source_title: faker.lorem.sentence(5),
            source_site_title: `${author}'s ${faker.word.noun()}`,
            source_excerpt: faker.lorem.paragraph(),
            source_author: author,
            source_featured_image: `https://api.dicebear.com/5.x/shapes/png?size=256&seed=${id}`,
            source_favicon: `https://api.dicebear.com/5.x/bottts/png?size=32&seed=${id}`,
            target: `${this.baseUrl}${this.model.slug}/`,
            resource_id: this.model.id,
            resource_type: 'post', // TODO: Randomise resource type - should also include pages
            created_at: dateToDatabaseString(timestamp),
            payload: JSON.stringify({
                // TODO: Add some random payload
            }),
            deleted: Math.floor(Math.random() * 2) ? true : false
        };
    }
}

module.exports = WebMentionsImporter;
