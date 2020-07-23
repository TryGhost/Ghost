const ghostBookshelf = require('./base');

const MemberStripeCustomer = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_customers',

    relationships: ['subscriptions'],

    relationshipBelongsTo: {
        subscriptions: 'members_stripe_customers_subscriptions'
    },

    subscriptions() {
        return this.hasMany('StripeCustomerSubscription', 'customer_id', 'customer_id');
    }
}, {
    async upsert(data, unfilteredOptions) {
        const customerId = data.customer_id;
        const model = await this.findOne({customer_id: customerId}, unfilteredOptions);
        if (model) {
            return this.edit(data, Object.assign({}, unfilteredOptions, {
                id: model.id
            }));
        }
        return this.add(data, unfilteredOptions);
    }
});

module.exports = {
    MemberStripeCustomer: ghostBookshelf.model('MemberStripeCustomer', MemberStripeCustomer)
};
