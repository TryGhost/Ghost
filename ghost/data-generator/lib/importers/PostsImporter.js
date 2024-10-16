const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {luck} = require('../utils/random');
const TableImporter = require('./TableImporter');
const dateToDatabaseString = require('../utils/database-date');

class PostsImporter extends TableImporter {
    static table = 'posts';
    static dependencies = ['newsletters'];
    defaultQuantity = faker.datatype.number({
        min: 80,
        max: 120
    });

    type = 'post';

    constructor(knex, transaction) {
        super(PostsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        this.newsletters = await this.transaction.select('id').from('newsletters').orderBy('sort_order');

        await super.import(quantity);
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
        if (this.type === 'page') {
            status = 'published';
        }

        const visibility = luck(85) ? 'paid' : luck(10) ? 'members' : 'public';

        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(timestamp),
            created_by: '1',
            updated_at: dateToDatabaseString(timestamp),
            published_at: status === 'published' ? dateToDatabaseString(timestamp) : status === 'scheduled' ? dateToDatabaseString(faker.date.soon(5, timestamp)) : null,
            uuid: faker.datatype.uuid(),
            title: title,
            type: this.type,
            slug: `${slugify(title)}-${faker.random.numeric(3)}`,
            status,
            visibility,
            lexical: JSON.stringify({
                root: {
                    children: content.map(paragraph => (
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: paragraph,
                                    type: 'extended-text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    )),
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }),
            html: content.map(paragraph => `<p>${paragraph}</p>`).join(''),
            plaintext: content.join('\n\n'),
            email_recipient_filter: 'all',
            newsletter_id: this.type === 'post' && status === 'published' && luck(90) ? (visibility === 'paid' ? this.newsletters[0].id : this.newsletters[1].id) : null
        };
    }
}

module.exports = PostsImporter;
