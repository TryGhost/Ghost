const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const TableImporter = require('./base');

class PostsImporter extends TableImporter {
    constructor(knex, {newsletters}) {
        super('posts', knex);
        this.newsletters = newsletters;
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
            created_at: timestamp,
            created_by: 'unused',
            updated_at: timestamp,
            published_at: faker.date.soon(5, timestamp),
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
            newsletter_id: faker.datatype.boolean() ? this.newsletters[faker.datatype.number(this.newsletters.length - 1)].id : undefined
        };
    }
}

module.exports = PostsImporter;
