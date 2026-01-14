const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersSubscriptionCreatedEventsImporter extends TableImporter {
    static table = 'members_subscription_created_events';
    static dependencies = ['members_stripe_customers', 'members_stripe_customers_subscriptions', 'posts', 'mentions'];

    constructor(knex, transaction) {
        super(MembersSubscriptionCreatedEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        let offset = 0;
        let limit = 1000;
        this.posts = await this.transaction.select('id', 'published_at', 'visibility', 'type', 'slug').from('posts').whereNotNull('published_at').where('visibility', 'public').orderBy('published_at', 'desc');
        this.incomingRecommendations = await this.transaction.select('id', 'source', 'created_at').from('mentions');

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const membersStripeCustomersSubscriptions = await this.transaction.select('id', 'created_at', 'customer_id').from('members_stripe_customers_subscriptions').limit(limit).offset(offset);

            if (membersStripeCustomersSubscriptions.length === 0) {
                break;
            }
            const membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers').whereIn('customer_id', membersStripeCustomersSubscriptions.map(subscription => subscription.customer_id));

            this.membersStripeCustomers = new Map();
            for (const memberStripeCustomer of membersStripeCustomers) {
                this.membersStripeCustomers.set(memberStripeCustomer.customer_id, memberStripeCustomer);
            }
            await this.importForEach(membersStripeCustomersSubscriptions, quantity ? quantity / membersStripeCustomersSubscriptions.length : 1);
            offset += limit;
        }
    }

    generate() {
        // We need to add all properties here already otherwise CSV imports won't know all the columns
        let attribution = {
            attribution_id: null,
            attribution_type: null,
            attribution_url: null
        };
        let referrer = {
            referrer_source: null,
            referrer_url: null,
            referrer_medium: null
        };

        if (luck(30)) {
            const post = this.posts.find(p => p.visibility === 'public' && new Date(p.published_at) < new Date(this.model.created_at));
            if (post) {
                attribution = {
                    attribution_id: post.id,
                    attribution_type: post.type,
                    attribution_url: post.slug
                };
            }
        }

        if (luck(40)) {
            if (luck(20)) {
                // Ghost network
                referrer = {
                    referrer_source: luck(20) ? 'Ghost.org' : 'Ghost Explore',
                    referrer_url: 'ghost.org',
                    referrer_medium: 'Ghost Network'
                };
            } else {
                // Incoming recommendation
                const incomingRecommendation = faker.helpers.arrayElement(this.incomingRecommendations);

                const hostname = new URL(incomingRecommendation.source).hostname;
                referrer = {
                    referrer_source: hostname,
                    referrer_url: hostname,
                    referrer_medium: faker.helpers.arrayElement([null, 'Email'])
                };
            }
        }

        const memberCustomer = this.membersStripeCustomers.get(this.model.customer_id);

        return {
            id: this.fastFakeObjectId(),
            created_at: this.model.created_at,
            member_id: memberCustomer.member_id,
            subscription_id: this.model.id,
            ...attribution,
            ...referrer
        };
    }
}

module.exports = MembersSubscriptionCreatedEventsImporter;
