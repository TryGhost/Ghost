const tables = require('./tables');
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
    MembersStripeCustomersSubscriptionsImporter,
    MembersPaidSubscriptionEventsImporter,
    MembersSubscriptionCreatedEventsImporter,
    MembersSubscribeEventsImporter,
    MentionsImporter,
    EmailsImporter
} = tables;
const path = require('path');
const fs = require('fs/promises');
const {faker} = require('@faker-js/faker');
const JsonImporter = require('./utils/json-importer');
const {getProcessRoot} = require('@tryghost/root-utils');

/**
 * @typedef {Object} DataGeneratorOptions
 * @property {string} baseDataPack
 * @property {import('knex/types').Knex} knex
 * @property {Object} schema
 * @property {Object} logger
 * @property {Object} modelQuantities
 * @property {string} baseUrl
 */

const defaultQuantities = {
    members: () => faker.datatype.number({
        min: 7000,
        max: 8000
    }),
    membersLoginEvents: 100,
    posts: () => faker.datatype.number({
        min: 80,
        max: 120
    })
};

class DataGenerator {
    /**
     *
     * @param {DataGeneratorOptions} options
     */
    constructor({
        baseDataPack = '',
        knex,
        schema,
        logger,
        modelQuantities = {},
        baseUrl
    }) {
        this.useBaseData = baseDataPack !== '';
        this.baseDataPack = baseDataPack;
        this.knex = knex;
        this.schema = schema;
        this.logger = logger;
        this.modelQuantities = Object.assign({}, defaultQuantities, modelQuantities);
        this.baseUrl = baseUrl;
    }

    async importData() {
        const transaction = await this.knex.transaction();
        this.logger.info('Starting import process, this has two parts: base data and member data. It can take a while...');

        const usersImporter = new UsersImporter(transaction);
        const users = await usersImporter.import({amount: 8});

        let newsletters;
        let posts;
        let tags;
        let products;
        let stripeProducts;
        let stripePrices;
        let benefits;

        // Use an existant set of data for a more realisitic looking site
        if (this.useBaseData) {
            let baseDataPack = this.baseDataPack;
            if (!path.isAbsolute(this.baseDataPack)) {
                baseDataPack = path.join(getProcessRoot(), baseDataPack);
            }
            let baseData = {};
            try {
                baseData = JSON.parse(await (await fs.readFile(baseDataPack)).toString());
                this.logger.info('Read base data pack');
            } catch (error) {
                this.logger.error('Failed to read data pack: ', error);
                throw error;
            }

            this.logger.info('Starting base data import');
            const jsonImporter = new JsonImporter(transaction);

            // Must have at least 2 in base data set
            await transaction('newsletters').delete();
            newsletters = await jsonImporter.import({
                name: 'newsletters',
                data: baseData.newsletters,
                rows: ['sort_order']
            });
            newsletters.sort((a, b) => a.sort_order - b.sort_order);

            await transaction('posts_authors').delete();
            await transaction('posts_tags').delete();
            await transaction('posts_meta').delete();

            await transaction('posts').delete();
            const postsImporter = new PostsImporter(transaction, {
                newsletters
            });
            posts = await jsonImporter.import({
                name: 'posts',
                data: baseData.posts
            });
            await postsImporter.addNewsletters({posts});
            posts = await transaction.select('id', 'newsletter_id').from('posts');

            await transaction('tags').delete();
            tags = await jsonImporter.import({
                name: 'tags',
                data: baseData.tags
            });

            await transaction('products').delete();
            products = await jsonImporter.import({
                name: 'products',
                data: baseData.products,
                rows: ['name', 'monthly_price', 'yearly_price']
            });

            benefits = await jsonImporter.import({
                name: 'benefits',
                data: baseData.benefits
            });
            await jsonImporter.import({
                name: 'products_benefits',
                data: baseData.products_benefits
            });

            stripeProducts = await jsonImporter.import({
                name: 'stripe_products',
                data: baseData.stripe_products,
                rows: ['product_id', 'stripe_product_id']
            });
            stripePrices = await jsonImporter.import({
                name: 'stripe_prices',
                data: baseData.stripe_prices,
                rows: ['stripe_price_id', 'interval', 'stripe_product_id', 'currency', 'amount', 'nickname']
            });

            // Import settings
            await transaction('settings').delete();
            await jsonImporter.import({
                name: 'settings',
                data: baseData.settings
            });
            await jsonImporter.import({
                name: 'custom_theme_settings',
                data: baseData.custom_theme_settings
            });

            this.logger.info('Completed base data import');
        } else {
            this.logger.info('No base data pack specified, starting random base data generation');
            const newslettersImporter = new NewslettersImporter(transaction);
            // First newsletter is free, second is paid
            newsletters = await newslettersImporter.import({amount: 2, rows: ['name', 'sort_order']});
            newsletters.sort((a, b) => a.sort_order - b.sort_order);

            const postsImporter = new PostsImporter(transaction, {
                newsletters
            });
            posts = await postsImporter.import({
                amount: this.modelQuantities.posts,
                rows: ['newsletter_id', 'published_at', 'slug']
            });

            const tagsImporter = new TagsImporter(transaction, {
                users
            });
            tags = await tagsImporter.import({amount: faker.datatype.number({
                min: 16,
                max: 24
            })});

            const productsImporter = new ProductsImporter(transaction);
            products = await productsImporter.import({amount: 4, rows: ['name', 'monthly_price', 'yearly_price']});

            const stripeProductsImporter = new StripeProductsImporter(transaction);
            stripeProducts = await stripeProductsImporter.importForEach(products.filter(product => product.name !== 'Free'), {
                amount: 1,
                rows: ['product_id', 'stripe_product_id']
            });

            const stripePricesImporter = new StripePricesImporter(transaction, {products});
            stripePrices = await stripePricesImporter.importForEach(stripeProducts, {
                amount: 2,
                rows: ['stripe_price_id', 'interval', 'stripe_product_id', 'currency', 'amount', 'nickname']
            });

            await productsImporter.addStripePrices({
                products,
                stripeProducts,
                stripePrices
            });

            const benefitsImporter = new BenefitsImporter(transaction);
            benefits = await benefitsImporter.import({amount: 5});

            const productsBenefitsImporter = new ProductsBenefitsImporter(transaction, {benefits});
            // Up to 5 benefits for each product
            await productsBenefitsImporter.importForEach(products, {amount: 5});

            this.logger.info('Completed random base data generation');
        }

        this.logger.info('Started member data generation');

        const postsTagsImporter = new PostsTagsImporter(transaction, {
            tags
        });
        await postsTagsImporter.importForEach(posts, {
            amount: () => faker.datatype.number({
                min: 0,
                max: 3
            })
        });

        const membersImporter = new MembersImporter(transaction);
        const members = await membersImporter.import({amount: this.modelQuantities.members, rows: ['status', 'created_at', 'name', 'email']});

        const postsAuthorsImporter = new PostsAuthorsImporter(transaction, {
            users
        });
        await postsAuthorsImporter.importForEach(posts, {amount: 1});

        // TODO: Use subscriptions to generate members_products table?
        const membersProductsImporter = new MembersProductsImporter(transaction, {products: products.filter(product => product.name !== 'Free')});
        const membersProducts = await membersProductsImporter.importForEach(members.filter(member => member.status !== 'free'), {
            amount: 1,
            rows: ['product_id', 'member_id']
        });
        const membersFreeProductsImporter = new MembersProductsImporter(transaction, {products: products.filter(product => product.name === 'Free')});
        await membersFreeProductsImporter.importForEach(members.filter(member => member.status === 'free'), {
            amount: 1,
            rows: ['product_id', 'member_id']
        });

        const postsProductsImporter = new PostsProductsImporter(transaction, {products: products.slice(1)});
        // Paid newsletters
        await postsProductsImporter.importForEach(posts.filter(post => newsletters.findIndex(newsletter => newsletter.id === post.newsletter_id) === 1), {
            // Each post is available on all 3 premium products
            amount: 3
        });

        const membersCreatedEventsImporter = new MembersCreatedEventsImporter(transaction);
        await membersCreatedEventsImporter.importForEach(members, {amount: 1});

        const membersLoginEventsImporter = new MembersLoginEventsImporter(transaction);
        // Will create roughly 1 login event for every 3 days, up to a maximum of 100.
        await membersLoginEventsImporter.importForEach(members, {amount: this.modelQuantities.membersLoginEvents});

        const membersStatusEventsImporter = new MembersStatusEventsImporter(transaction);
        // Up to 2 events per member - 1 from null -> free, 1 from free -> {paid, comped}
        await membersStatusEventsImporter.importForEach(members, {amount: 2});

        const subscriptionsImporter = new SubscriptionsImporter(transaction, {members, stripeProducts, stripePrices});
        const subscriptions = await subscriptionsImporter.importForEach(membersProducts, {
            amount: 1,
            rows: ['cadence', 'tier_id', 'expires_at', 'created_at', 'member_id', 'currency']
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
        const membersStripeCustomersSubscriptions = await membersStripeCustomersSubscriptionsImporter.importForEach(subscriptions, {
            amount: 1,
            rows: ['mrr', 'plan_id', 'subscription_id']
        });

        const membersSubscribeEventsImporter = new MembersSubscribeEventsImporter(transaction, {newsletters, subscriptions});
        const membersSubscribeEvents = await membersSubscribeEventsImporter.importForEach(members, {
            amount: 2,
            rows: ['member_id', 'newsletter_id', 'created_at']
        });

        const membersNewslettersImporter = new MembersNewslettersImporter(transaction);
        await membersNewslettersImporter.importForEach(membersSubscribeEvents, {amount: 1});

        const membersPaidSubscriptionEventsImporter = new MembersPaidSubscriptionEventsImporter(transaction, {
            membersStripeCustomersSubscriptions
        });
        await membersPaidSubscriptionEventsImporter.importForEach(subscriptions, {amount: 1});

        const membersSubscriptionCreatedEventsImporter = new MembersSubscriptionCreatedEventsImporter(transaction, {subscriptions});
        await membersSubscriptionCreatedEventsImporter.importForEach(membersStripeCustomersSubscriptions, {amount: 1});

        const mentionsImporter = new MentionsImporter(transaction, {baseUrl: this.baseUrl});
        // Generate up to 4 webmentions per post
        await mentionsImporter.importForEach(posts, {amount: 4});

        const emailsImporter = new EmailsImporter(transaction, {newsletters, members, membersSubscribeEvents});
        await emailsImporter.importForEach(posts, {amount: 1});

        // TODO: Email clicks - redirect, members_click_events (relies on emails)

        // TODO: Feedback - members_feedback (relies on members and posts)

        await transaction.commit();

        this.logger.info('Completed member data generation');
        this.logger.ok('Completed import process.');
    }
}

module.exports = DataGenerator;
module.exports.tables = tables;
