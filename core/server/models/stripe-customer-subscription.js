const ghostBookshelf = require('./base');

const CURRENCY_SYMBOLS = {
    usd: '$',
    aud: '$',
    cad: '$',
    gbp: '£',
    eur: '€',
    inr: '₹'
};

const StripeCustomerSubscription = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_customers_subscriptions',

    customer() {
        return this.belongsTo('MemberStripeCustomer', 'customer_id', 'customer_id');
    },

    serialize(options) {
        const defaultSerializedObject = ghostBookshelf.Model.prototype.serialize.call(this, options);

        return {
            id: defaultSerializedObject.subscription_id,
            customer: {
                id: defaultSerializedObject.customer_id,
                // TODO? The customer is not fetched by default so these sometimes won't exist
                name: defaultSerializedObject.customer ? defaultSerializedObject.customer.name : null,
                email: defaultSerializedObject.customer ? defaultSerializedObject.customer.email : null
            },
            plan: {
                id: defaultSerializedObject.plan_id,
                nickname: defaultSerializedObject.plan_nickname,
                amount: defaultSerializedObject.plan_amount,
                interval: defaultSerializedObject.plan_interval,
                currency: String.prototype.toUpperCase.call(defaultSerializedObject.plan_currency),
                currency_symbol: CURRENCY_SYMBOLS[String.prototype.toLowerCase.call(defaultSerializedObject.plan_currency)]
            },
            status: defaultSerializedObject.status,
            start_date: defaultSerializedObject.start_date,
            default_payment_card_last4: defaultSerializedObject.default_payment_card_last4,
            cancel_at_period_end: defaultSerializedObject.cancel_at_period_end,
            cancellation_reason: defaultSerializedObject.cancellation_reason,
            current_period_end: defaultSerializedObject.current_period_end
        };
    }

}, {
    async upsert(data, unfilteredOptions) {
        const subscriptionId = unfilteredOptions.subscription_id;
        const model = await this.findOne({subscription_id: subscriptionId}, unfilteredOptions);
        if (model) {
            return this.edit(data, Object.assign({}, unfilteredOptions, {
                id: model.id
            }));
        }
        return this.add(data, unfilteredOptions);
    }
});

module.exports = {
    StripeCustomerSubscription: ghostBookshelf.model('StripeCustomerSubscription', StripeCustomerSubscription)
};
