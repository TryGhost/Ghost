const {
    PostsImporter,
    NewslettersImporter,
    UsersImporter,
    PostsAuthorsImporter,
    TagsImporter,
    PostsTagsImporter,
    ProductsImporter,
    MembersImporter,
    BenefitsImporter,
    ProductsBenefitsImporter,
    MembersProductsImporter,
    PostsProductsImporter,
    MembersNewslettersImporter
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
            // First newsletter is free, second is paid
            const newsletters = await newsletterImporter.import({amount: 2});

            const postImporter = new PostsImporter(transaction, {
                newsletters
            });
            const posts = await postImporter.import({
                amount: 100,
                rows: ['newsletter_id']
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
                    min: 0,
                    max: 3
                })
            });

            const productImporter = new ProductsImporter(transaction);
            const products = await productImporter.import({amount: 3, rows: ['name']});

            const memberImporter = new MembersImporter(transaction);
            const members = await memberImporter.import({amount: () => faker.datatype.number({
                min: 7000,
                max: 8000
            }), rows: ['status']});

            const benefitImporter = new BenefitsImporter(transaction);
            const benefits = await benefitImporter.import({amount: 5});

            const productBenefitImporter = new ProductsBenefitsImporter(transaction, {benefits});
            // Up to 5 benefits for each product
            await productBenefitImporter.importForEach(products, {amount: 5});

            const memberProductImporter = new MembersProductsImporter(transaction, {products});
            await memberProductImporter.importForEach(members.filter(member => member.status !== 'free'), {amount: 1});

            const postProductImporter = new PostsProductsImporter(transaction, {products});
            // Paid newsletters
            await postProductImporter.importForEach(posts.filter(post => newsletters.findIndex(newsletter => newsletter.id === post.newsletter_id) === 1), {
                // Each post is available on all 3 products
                amount: 3
            });

            const memberNewsletterImporter = new MembersNewslettersImporter(transaction, {newsletters});
            await memberNewsletterImporter.importForEach(members, {amount: 1});
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
