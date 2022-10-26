const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');

class MembersSubscriptionCreatedEventsImporter extends TableImporter {
    constructor(knex, {subscriptions}) {
        super('members_subscription_created_events', knex);
        this.subscriptions = subscriptions;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const subscription = this.subscriptions.find(s => s.id === this.model.subscription_id);
        return {
            id: faker.database.mongodbObjectId(),
            created_at: subscription.created_at,
            member_id: subscription.member_id,
            subscription_id: this.model.id,
            // TODO: Implement attributions
            attribution_id: null,
            attribution_type: null,
            attribution_url: null,
            // TODO: Implement referrers
            referrer_source: null,
            referrer_medium: null,
            referrer_url: null
        };
    }
}

module.exports = MembersSubscriptionCreatedEventsImporter;
