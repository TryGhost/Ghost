const {
    PostsImporter,
    NewslettersImporter,
    UsersImporter,
    PostsAuthorsImporter
} = require('./tables');

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
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const posts = await postImporter.import({
                amount: 100,
                startTime: twoYearsAgo,
                endTime: new Date()
            });

            const userImporter = new UsersImporter(transaction);
            const users = await userImporter.import({amount: 8});

            const postAuthorImporter = new PostsAuthorsImporter(transaction, {
                users
            });
            await postAuthorImporter.importForEach(posts, {amount: 1});
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
