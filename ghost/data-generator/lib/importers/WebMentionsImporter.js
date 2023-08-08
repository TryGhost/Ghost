const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class WebMentionsImporter extends TableImporter {
    static table = 'mentions';
    static dependencies = ['posts'];

    constructor(knex, transaction, {baseUrl}) {
        super(WebMentionsImporter.table, knex, transaction);

        this.baseUrl = baseUrl;
    }

    async import(quantity) {
        const posts = await this.transaction.select('id', 'slug', 'published_at').from('posts').where('type', 'post');

        this.quantity = quantity ? quantity / posts.length : 4;
        await this.importForEach(posts, this.quantity);
    }

    setReferencedModel(model) {
        this.model = model;

        // Most web mentions published soon after publication date
        const startDate = new Date(this.model.published_at);
        // End date should be either 1 year after post is published, or current date, whichever is first
        const endDate = new Date(Math.min(new Date().valueOf(), new Date(startDate).setFullYear(startDate.getFullYear() + 1)));
        this.timestamps = generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            total: this.quantity,
            startTime: startDate,
            endTime: endDate
        }).sort();
    }

    generate() {
        if (luck(50)) {
            // 50% chance of 1 mention, 25% chance of 2 mentions, etc.
            return null;
        }

        const id = faker.database.mongodbObjectId();
        const timestamp = this.timestamps.shift();

        const author = `${faker.name.fullName()}`;
        /**
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        source: {type: 'string', maxlength: 2000, nullable: false},
        source_title: {type: 'string', maxlength: 2000, nullable: true},
        source_site_title: {type: 'string', maxlength: 2000, nullable: true},
        source_excerpt: {type: 'string', maxlength: 2000, nullable: true},
        source_author: {type: 'string', maxlength: 2000, nullable: true},
        source_featured_image: {type: 'string', maxlength: 2000, nullable: true},
        source_favicon: {type: 'string', maxlength: 2000, nullable: true},
        target: {type: 'string', maxlength: 2000, nullable: false},
        resource_id: {type: 'string', maxlength: 24, nullable: true},
        resource_type: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        payload: {type: 'text', maxlength: 65535, nullable: true},
        deleted: {type: 'boolean', nullable: false, defaultTo: false},
        verified: {type: 'boolean', nullable: false, defaultTo: false}
         */
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
