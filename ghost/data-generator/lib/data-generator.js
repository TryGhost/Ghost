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
    MembersNewslettersImporter,
    MembersCreatedEventsImporter,
    MembersLoginEventsImporter,
    MembersStatusEventsImporter,
    StripeProductsImporter,
    StripePricesImporter,
    SubscriptionsImporter,
    MembersStripeCustomersImporter,
    MembersStripeCustomersSubscriptionsImporter
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
                amount: faker.datatype.number({
                    min: 80,
                    max: 120
                }),
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
            const tags = await tagImporter.import({amount: faker.datatype.number({
                min: 16,
                max: 24
            })});

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
            const products = await productImporter.import({amount: 4, rows: ['name', 'monthly_price', 'yearly_price']});

            const memberImporter = new MembersImporter(transaction);
            const members = await memberImporter.import({amount: () => faker.datatype.number({
                min: 7000,
                max: 8000
            }), rows: ['status', 'created_at', 'name', 'email']});

            const benefitImporter = new BenefitsImporter(transaction);
            const benefits = await benefitImporter.import({amount: 5});

            const productBenefitImporter = new ProductsBenefitsImporter(transaction, {benefits});
            // Up to 5 benefits for each product
            await productBenefitImporter.importForEach(products, {amount: 5});

            // TODO: Use subscriptions to generate members_products table?
            const memberProductImporter = new MembersProductsImporter(transaction, {products: products.slice(1)});
            const membersProducts = await memberProductImporter.importForEach(members.filter(member => member.status !== 'free'), {
                amount: 1,
                rows: ['product_id', 'member_id']
            });
            const memberFreeProductImporter = new MembersProductsImporter(transaction, {products: [products[0]]});
            await memberFreeProductImporter.importForEach(members.filter(member => member.status === 'free'), {
                amount: 1,
                rows: ['product_id', 'member_id']
            });

            const postProductImporter = new PostsProductsImporter(transaction, {products});
            // Paid newsletters
            await postProductImporter.importForEach(posts.filter(post => newsletters.findIndex(newsletter => newsletter.id === post.newsletter_id) === 1), {
                // Each post is available on all 3 products
                amount: 3
            });

            const memberNewsletterImporter = new MembersNewslettersImporter(transaction, {newsletters});
            await memberNewsletterImporter.importForEach(members, {amount: 1});

            const membersCreatedEventsImporter = new MembersCreatedEventsImporter(transaction);
            await membersCreatedEventsImporter.importForEach(members, {amount: 1});

            const membersLoginEventsImporter = new MembersLoginEventsImporter(transaction);
            // Will create roughly 1 login event for every 3 days, up to a maximum of 100.
            await membersLoginEventsImporter.importForEach(members, {amount: 100});

            const membersStatusEventsImporter = new MembersStatusEventsImporter(transaction);
            // Up to 2 events per member - 1 from null -> free, 1 from free -> {paid, comped}
            await membersStatusEventsImporter.importForEach(members, {amount: 2});

            const stripeProductsImporter = new StripeProductsImporter(transaction);
            const stripeProducts = await stripeProductsImporter.importForEach(products, {
                amount: 1,
                rows: ['product_id', 'stripe_product_id']
            });

            const stripePricesImporter = new StripePricesImporter(transaction, {products});
            const stripePrices = await stripePricesImporter.importForEach(stripeProducts, {
                amount: 2,
                rows: ['stripe_price_id', 'interval', 'stripe_product_id', 'currency', 'amount', 'nickname']
            });

            const subscriptionsImporter = new SubscriptionsImporter(transaction, {members, stripeProducts, stripePrices});
            const subscriptions = await subscriptionsImporter.importForEach(membersProducts, {
                amount: 1,
                rows: ['cadence', 'tier_id', 'expires_at', 'created_at', 'member_id']
            });

            const membersStripeCustomersImporter = new MembersStripeCustomersImporter(transaction);
            const membersStripeCustomers = await membersStripeCustomersImporter.importForEach(members, {
                amount: 1,
                rows: ['customer_id', 'member_id']
            });

            const membersStripeCustomersSubscriptionsImporter = new MembersStripeCustomersSubscriptionsImporter(transaction, {
                membersStripeCustomers,
                products,
                stripeProducts,
                stripePrices
            });
            await membersStripeCustomersSubscriptionsImporter.importForEach(subscriptions, {amount: 1});

            // TODO: Emails! (relies on posts & newsletters)

            // TODO: Email clicks - redirect, members_click_events (relies on emails)

            // TODO: Feedback - members_feedback (relies on members and posts)
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
