const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {luck} = require('../utils/random');
const TableImporter = require('./base');
const dateToDatabaseString = require('../utils/database-date');

class PostsImporter extends TableImporter {
    static table = 'posts';

    constructor(knex, {newsletters}) {
        super(PostsImporter.table, knex);
        this.newsletters = newsletters;
    }

    async addNewsletters({posts}) {
        for (const {id} of posts) {
            await this.knex('posts').update({
                newsletter_id: luck(90) ? this.newsletters[0].id : this.newsletters[1].id
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
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        const timestamp = faker.date.between(twoYearsAgo, twoWeeksFromNow);
        const currentTime = new Date();

        let status = 'published';
        if (timestamp > currentTime) {
            status = 'scheduled';
        }
        if (luck(5)) {
            status = 'draft';
        }

        const visibility = luck(90) ? 'paid' : luck(10) ? 'members' : 'public';

        return {
            id: faker.database.mongodbObjectId(),
            created_at: dateToDatabaseString(timestamp),
            created_by: 'unused',
            updated_at: dateToDatabaseString(timestamp),
            published_at: status === 'published' ? dateToDatabaseString(faker.date.soon(5, timestamp)) : null,
            uuid: faker.datatype.uuid(),
            title: title,
            slug: `${slugify(title)}-${faker.random.numeric(3)}`,
            status,
            visibility,
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
            newsletter_id: status === 'published' && luck(90) ? visibility === 'paid' ? this.newsletters[1].id : this.newsletters[0].id : null
        };
    }
}

module.exports = PostsImporter;
