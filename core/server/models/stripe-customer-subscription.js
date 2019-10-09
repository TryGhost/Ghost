const ghostBookshelf = require('./base');

const StripeCustomerSubscription = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_customers_subscriptions'
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
