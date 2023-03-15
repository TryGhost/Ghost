const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersSubscriptionCreatedEventsImporter extends TableImporter {
    static table = 'members_subscription_created_events';

    constructor(knex, {subscriptions, posts}) {
        super(MembersSubscriptionCreatedEventsImporter.table, knex);
        this.subscriptions = subscriptions;

        this.posts = [...posts];
        // Sort posts in reverse chronologoical order
        this.posts.sort((a, b) => new Date(b.published_at).valueOf() - new Date(a.published_at).valueOf());
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const subscription = this.subscriptions.find(s => s.id === this.model.ghost_subscription_id);
        let attribution = {};
        if (luck(10)) {
            const post = this.posts.find(p => p.visibility === 'public' && new Date(p.published_at) < new Date(subscription.created_at));
            if (post) {
                attribution = {
                    attribution_id: post.id,
                    attribution_type: post.type,
                    attribution_url: post.slug
                };
            }
        }
        return Object.assign({}, {
            id: faker.database.mongodbObjectId(),
            created_at: subscription.created_at,
            member_id: subscription.member_id,
            subscription_id: this.model.id,
            // TODO: Implement referrers
            referrer_source: null,
            referrer_medium: null,
            referrer_url: null
        }, attribution);
    }
}

module.exports = MembersSubscriptionCreatedEventsImporter;
