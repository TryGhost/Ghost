const {
    PostsImporter,
    NewslettersImporter,
    UsersImporter,
    PostsAuthorsImporter,
    TagsImporter,
    PostsTagsImporter
} = require('./tables');
const {faker} = require('@faker-js/faker');

/**
 * @typedef {Object} DataGeneratorOptions
 * @property {boolean} eventsOnly
 * @property {import('knex/types').Knex} knex
 * @property {Object} schema
 * @property {Object} logger
 */

class DataGenerator {
    /**
     *
     * @param {DataGeneratorOptions} options
     */
    constructor({
        eventsOnly = false,
        knex,
        schema,
        logger
    }) {
        this.eventsOnly = eventsOnly;
        this.knex = knex;
        this.schema = schema;
        this.logger = logger;
    }

    async importData() {
        const transaction = await this.knex.transaction();

        if (!this.eventsOnly) {
            const newsletterImporter = new NewslettersImporter(transaction);
            const newsletters = await newsletterImporter.import({amount: 2});

            const postImporter = new PostsImporter(transaction, {
                newsletters
            });
            const posts = await postImporter.import({
                amount: 100
            });

            const userImporter = new UsersImporter(transaction);
            const users = await userImporter.import({amount: 8});

            const postAuthorImporter = new PostsAuthorsImporter(transaction, {
                users
            });
            await postAuthorImporter.importForEach(posts, {amount: 1});

            const tagImporter = new TagsImporter(transaction, {
                users
            });
            const tags = await tagImporter.import({amount: 20});

            const postTagImporter = new PostsTagsImporter(transaction, {
                tags
            });
            await postTagImporter.importForEach(posts, {
                amount: () => faker.datatype.number({
                    min: 1,
                    max: 3
                })
            });
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
