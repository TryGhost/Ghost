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
            const newsletters = await newsletterImporter.import(2);

            const postImporter = new PostsImporter(transaction, {
                newsletters
            });
            const posts = await postImporter.import(100);

            const userImporter = new UsersImporter(transaction);
            const users = await userImporter.import(8);

            const postAuthorImporter = new PostsAuthorsImporter(transaction, {
                users
            });
            await postAuthorImporter.import(1, {ids: posts});
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
