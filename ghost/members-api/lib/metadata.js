module.exports = function ({
    Member,
    StripeWebhook,
    StripeCustomer,
    StripeCustomerSubscription
}) {
    async function setMetadata(module, metadata) {
        if (module !== 'stripe') {
            return;
        }

        if (metadata.customer) {
            const member = await Member.findOne({
                id: metadata.customer.member_id
            });

            if (member) {
                await StripeCustomer.upsert(metadata.customer, {
                    customer_id: metadata.customer.customer_id
                });
            }
        }

        if (metadata.subscription) {
            const customer = await StripeCustomer.findOne({
                customer_id: metadata.subscription.customer_id
            });
            if (customer) {
                await StripeCustomerSubscription.upsert(metadata.subscription, {
                    subscription_id: metadata.subscription.subscription_id
                });
            }
        }

        if (metadata.webhook) {
            await StripeWebhook.upsert(metadata.webhook, {
                webhook_id: metadata.webhook.webhook_id
            });
        }

        return;
    }

    async function getMetadata(module, member) {
        if (module !== 'stripe') {
            return;
        }

        const customers = (await StripeCustomer.findAll({
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

    return {
        setMetadata,
        getMetadata
    };
};
