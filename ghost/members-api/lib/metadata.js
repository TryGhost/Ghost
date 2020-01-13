let MemberStripeCustomer;
let StripeCustomerSubscription;

async function setMetadata(module, metadata) {
    if (module !== 'stripe') {
        return;
    }

    if (metadata.customer) {
        await MemberStripeCustomer.upsert(metadata.customer, {
            customer_id: metadata.customer.customer_id
        });
    }

    if (metadata.subscription) {
        await StripeCustomerSubscription.upsert(metadata.subscription, {
            subscription_id: metadata.subscription.subscription_id
        });
    }

    return;
}

async function getMetadata(module, member) {
    if (module !== 'stripe') {
        return;
    }

    const customers = (await MemberStripeCustomer.findAll({
        filter: `member_id:${member.id}`
    })).toJSON();

    const subscriptions = await customers.reduce(async (subscriptionsPromise, customer) => {
        const customerSubscriptions = await StripeCustomerSubscription.findAll({
            filter: `customer_id:${customer.customer_id}`
        });
        return (await subscriptionsPromise).concat(customerSubscriptions.toJSON());
    }, []);

    return {
        customers: customers,
        subscriptions: subscriptions
    };
}

module.exports = function ({
    memberStripeCustomerModel,
    stripeCustomerSubscriptionModel
}) {
    MemberStripeCustomer = memberStripeCustomerModel;
    StripeCustomerSubscription = stripeCustomerSubscriptionModel;

    return {
        setMetadata,
        getMetadata
    };
};
