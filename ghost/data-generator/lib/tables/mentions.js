const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class WebMentionsImporter extends TableImporter {
    constructor(knex, {baseUrl}) {
        super('mentions', knex);

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
            source_featured_image: 'https://via.placeholder.com/650x150.png',
            source_favicon: 'https://via.placeholder.com/32x32.png',
            target: `${this.baseUrl}${this.model.slug}/`,
            resource_id: this.model.id,
            resource_type: 'post', // TODO: Randomise resource type - should also include pages
            created_at: dateToDatabaseString(timestamp),
            payload: JSON.stringify({
                // TODO: Add some random payload
            })
        };
    }
}

module.exports = WebMentionsImporter;
