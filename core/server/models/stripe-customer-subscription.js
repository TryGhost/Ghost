const ghostBookshelf = require('./base');

const StripeCustomerSubscription = ghostBookshelf.Model.extend({
    tableName: 'stripe_customers_subscriptions'
});

module.exports = {
    StripeCustomerSubscription: ghostBookshelf.model('StripeCustomerSubscription', StripeCustomerSubscription)
};
