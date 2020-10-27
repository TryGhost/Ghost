module.exports = function ({
    Member,
    StripeWebhook,
    StripeCustomer,
    StripeCustomerSubscription
}) {
    async function setMetadata(module, metadata, options = {}) {
        if (module !== 'stripe') {
            return;
        }

        if (metadata.customer) {
            const member = await Member.findOne({
                id: metadata.customer.member_id
            }, options);

            if (member) {
                await StripeCustomer.upsert(metadata.customer, {
                    ...options,
                    customer_id: metadata.customer.customer_id
                });
            }
        }

        if (metadata.subscription) {
            const customer = await StripeCustomer.findOne({
                customer_id: metadata.subscription.customer_id
            }, options);
            if (customer) {
                await StripeCustomerSubscription.upsert(metadata.subscription, {
                    ...options,
                    subscription_id: metadata.subscription.subscription_id
                });
            }
        }

        if (metadata.webhook) {
            await StripeWebhook.upsert(metadata.webhook, {
                ...options,
                webhook_id: metadata.webhook.webhook_id
            });
        }

        return;
    }

    async function getMetadata(module, member) {
        if (module !== 'stripe') {
            return;
        }

        if (!member.relations.stripeCustomers) {
            await member.load(['stripeCustomers']);
        }

        if (!member.relations.stripeSubscriptions) {
            await member.load(['stripeSubscriptions', 'stripeSubscriptions.customer']);
        }

        const customers = member.related('stripeCustomers').toJSON();
        const subscriptions = member.related('stripeSubscriptions').toJSON();

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
