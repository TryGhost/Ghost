const TableImporter = require('./TableImporter');

class MembersPaidSubscriptionEventsImporter extends TableImporter {
    static table = 'members_paid_subscription_events';
    static dependencies = ['members_stripe_customers_subscriptions'];

    constructor(knex, transaction) {
        super(MembersPaidSubscriptionEventsImporter.table, knex, transaction);
    }

    async import() {
        let offset = 0;
        let limit = 1000;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const subscriptions = await this.transaction.select('id', 'customer_id', 'plan_currency', 'plan_amount', 'created_at', 'plan_id', 'status', 'cancel_at_period_end', 'current_period_end').from('members_stripe_customers_subscriptions').limit(limit).offset(offset);

            if (subscriptions.length === 0) {
                break;
            }
            const membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers').whereIn('customer_id', subscriptions.map(subscription => subscription.customer_id));

            this.membersStripeCustomers = new Map();
            for (const customer of membersStripeCustomers) {
                this.membersStripeCustomers.set(customer.customer_id, customer);
            }
            await this.importForEach(subscriptions, 2);

            offset += limit;
        }
    }

    setReferencedModel(model) {
        this.model = model;
        this.count = 0;
    }

    isActiveSubscriptionStatus(status) {
        return ['active', 'trialing', 'unpaid', 'past_due'].includes(status);
    }

    getStatus(modelToCheck) {
        const status = modelToCheck.status;
        const canceled = modelToCheck.cancel_at_period_end;

        if (status === 'canceled') {
            return 'expired';
        }

        if (canceled) {
            return 'canceled';
        }

        if (this.isActiveSubscriptionStatus(status)) {
            return 'active';
        }

        return 'inactive';
    }

    generate() {
        this.count += 1;

        const isActive = this.isActiveSubscriptionStatus(this.model.status);
        if (this.count > 1 && isActive) {
            // We only need one event, because the MRR is still here
            return;
        }

        if (this.model.status === 'incomplete' || this.model.status === 'incomplete_expired') {
            // Not a paid subscription
            return;
        }

        const memberCustomer = this.membersStripeCustomers.get(this.model.customer_id);
        const isMonthly = this.model.plan_interval === 'month';

        // Note that we need to recalculate the MRR, because it will be zero for inactive subscrptions
        const mrr = isMonthly ? this.model.plan_amount : Math.floor(this.model.plan_amount / 12);

        // todo: implement + MRR and -MRR in case of inactive subscriptions
        return {
            id: this.fastFakeObjectId(),
            // TODO: Support expired / updated / cancelled events too
            type: this.count === 1 ? 'created' : this.getStatus(this.model),
            member_id: memberCustomer.member_id,
            subscription_id: this.model.id,
            from_plan: this.count === 1 ? null : this.model.plan_id,
            to_plan: this.count === 1 ? this.model.plan_id : null,
            currency: this.model.plan_currency,
            source: 'stripe',
            mrr_delta: this.count === 1 ? mrr : -mrr,
            created_at: this.count === 1 ? this.model.created_at : this.model.current_period_end
        };
    }
}

module.exports = MembersPaidSubscriptionEventsImporter;
