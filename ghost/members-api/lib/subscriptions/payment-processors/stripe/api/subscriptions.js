const customers = require('./customers');
const {del, create, createSource} = require('./stripeRequests');

function removeSubscription(stripe, member) {
    return customers.get(stripe, member, member.email).then((customer) => {
        // CASE customer has no subscriptions
        if (!customer.subscriptions || customer.subscriptions.total_count === 0) {
            throw new Error('Cannot remove subscription');
        }

        const subscription = customer.subscriptions.data[0];

        return del(stripe, 'subscriptions', subscription.id);
    });
}

function getSubscription(stripe, member) {
    return customers.get(stripe, member, member.email).then((customer) => {
        // CASE customer has either none or multiple subscriptions
        if (!customer.subscriptions || customer.subscriptions.total_count !== 1) {
            return {};
        }

        const subscription = customer.subscriptions.data[0];

        // CASE subscription has multiple plans
        if (subscription.items.total_count !== 1) {
            return {};
        }

        const plan = subscription.plan;

        return {
            validUntil: subscription.current_period_end,
            plan: plan.nickname,
            amount: plan.amount,
            status: subscription.status
        };
    }).catch(() => {
        return {};
    });
}

function createSubscription(stripe, member, metadata) {
    return customers.ensure(stripe, member, member.email).then((customer) => {
        if (customer.subscriptions && customer.subscriptions.total_count !== 0) {
            throw new Error('Customer already has a subscription');
        }

        return createSource(stripe, customer.id, metadata.stripeToken).then(() => {
            return create(stripe, 'subscriptions', {
                customer: customer.id,
                items: [{plan: metadata.plan.id}],
                coupon: metadata.coupon
            });
        });
    });
}

module.exports = {
    create: createSubscription,
    get: getSubscription,
    remove: removeSubscription
};
