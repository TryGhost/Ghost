const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {luck} = require('../utils/random');
const TableImporter = require('./base');
const dateToDatabaseString = require('../utils/database-date');

class PostsImporter extends TableImporter {
    constructor(knex, {newsletters}) {
        super('posts', knex);
        this.newsletters = newsletters;
    }

    async addNewsletters({posts}) {
        for (const {id} of posts) {
            await this.knex('posts').update({
                newsletter_id: luck(10) ? this.newsletters[0].id : this.newsletters[1].id
            }).where({id});
        }
    }

    generate() {
        const title = faker.lorem.sentence();
        const content = faker.lorem.paragraphs(faker.datatype.number({
            min: 3,
            max: 10
        })).split('\n');
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const timestamp = faker.date.between(twoYearsAgo, twoWeeksAgo);
        return {
            id: faker.database.mongodbObjectId(),
            created_at: dateToDatabaseString(timestamp),
            created_by: 'unused',
            updated_at: dateToDatabaseString(timestamp),
            published_at: dateToDatabaseString(faker.date.soon(5, timestamp)),
            uuid: faker.datatype.uuid(),
            title: title,
            slug: `${slugify(title)}-${faker.random.numeric(3)}`,
            status: 'published',
            mobiledoc: JSON.stringify({
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [['em']],
                sections: content.map(paragraph => [
                    1,
                    'p',
                    [
                        [
                            0,
                            [],
                            0,
                            paragraph
                        ]
                    ]
                ])
            }),
            html: content.map(paragraph => `<p>${paragraph}</p>`).join(''),
            email_recipient_filter: 'all',
            newsletter_id: luck(10) ? this.newsletters[0].id : this.newsletters[1].id
        };
    }
}

module.exports = PostsImporter;
