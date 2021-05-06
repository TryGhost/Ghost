const ghostBookshelf = require('./base');
const _ = require('lodash');

const StripeCustomerSubscription = ghostBookshelf.Model.extend({
    tableName: 'members_stripe_customers_subscriptions',

    customer() {
        return this.belongsTo('MemberStripeCustomer', 'customer_id', 'customer_id');
    },

    stripePrice() {
        return this.hasOne('StripePrice', 'stripe_price_id', 'stripe_price_id');
    },

    serialize(options) {
        const defaultSerializedObject = ghostBookshelf.Model.prototype.serialize.call(this, options);

        const serialized = {
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
                currency: String.prototype.toUpperCase.call(defaultSerializedObject.plan_currency)
            },
            status: defaultSerializedObject.status,
            start_date: defaultSerializedObject.start_date,
            default_payment_card_last4: defaultSerializedObject.default_payment_card_last4,
            cancel_at_period_end: defaultSerializedObject.cancel_at_period_end,
            cancellation_reason: defaultSerializedObject.cancellation_reason,
            current_period_end: defaultSerializedObject.current_period_end
        };

        if (!_.isEmpty(defaultSerializedObject.stripePrice)) {
            serialized.price = {
                id: defaultSerializedObject.stripePrice.stripe_price_id,
                price_id: defaultSerializedObject.stripePrice.id,
                nickname: defaultSerializedObject.stripePrice.nickname,
                amount: defaultSerializedObject.stripePrice.amount,
                interval: defaultSerializedObject.stripePrice.interval,
                type: defaultSerializedObject.stripePrice.type,
                currency: String.prototype.toUpperCase.call(defaultSerializedObject.stripePrice.currency)
            };

            if (defaultSerializedObject.stripePrice.stripeProduct) {
                const productData = defaultSerializedObject.stripePrice.stripeProduct.product || {};
                serialized.price.product = {
                    id: defaultSerializedObject.stripePrice.stripeProduct.stripe_product_id,
                    name: productData.name,
                    product_id: defaultSerializedObject.stripePrice.stripeProduct.product_id
                };
            }
        }

        return serialized;
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
