const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');

class MembersPaidSubscriptionEventsImporter extends TableImporter {
    static table = 'members_paid_subscription_events';
    static dependencies = ['subscriptions', 'members_stripe_customers_subscriptions'];

    constructor(knex, transaction) {
        super(MembersPaidSubscriptionEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const subscriptions = await this.transaction.select('id', 'member_id', 'currency', 'created_at').from('subscriptions');
        this.membersStripeCustomersSubscriptions = await this.transaction.select('id', 'ghost_subscription_id', 'plan_id', 'mrr').from('members_stripe_customers_subscriptions');

        await this.importForEach(subscriptions, quantity ? quantity / subscriptions.length : 1);
    }

    generate() {
        if (!this.model.currency) {
            // Not a paid subscription
            return null;
        }
        // TODO: Implement upgrades
        const membersStripeCustomersSubscription = this.membersStripeCustomersSubscriptions.find((m) => {
            return m.ghost_subscription_id === this.model.id;
        });
        return {
            id: faker.database.mongodbObjectId(),
            // TODO: Support expired / updated / cancelled events too
            type: 'created',
            member_id: this.model.member_id,
            subscription_id: this.model.id,
            from_plan: null,
            to_plan: membersStripeCustomersSubscription.plan_id,
            currency: this.model.currency,
            source: 'stripe',
            mrr_delta: membersStripeCustomersSubscription.mrr,
            created_at: this.model.created_at
        };
    }
}

module.exports = MembersPaidSubscriptionEventsImporter;
