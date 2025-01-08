const errors = require('@tryghost/errors');
const _ = require('lodash');
const logging = require('@tryghost/logging');
module.exports = class SubscriptionEventService {
    constructor(deps) {
        this.deps = deps;
    }

    async handleSubscriptionEvent(subscription) {
        const subscriptionPriceData = _.get(subscription, 'items.data');
        if (!subscriptionPriceData || subscriptionPriceData.length !== 1) {
            throw new errors.BadRequestError({
                message: 'Subscription should have exactly 1 price item'
            });
        }

        const memberRepository = this.deps.memberRepository;
        const member = await memberRepository.get({
            customer_id: subscription.customer
        });

        // After checkout, Stripe sends `customer.subscription.created`, `customer.subscription.updated` and `checkout.session.completed` events
        // We want to create a member and its related subscription in the database based on the `checkout.session.completed` event as it contains additional information on the subscription (e.g. attribution data)
        // Therefore, if the member or the subscription does not exist in the database yet, we ignore `customer.subscription.*` events, to avoid creating subscriptions with missing data
        if (!member) {
            logging.info(`Ignoring customer.subscription.* event as member does not exist`);
            return;
        }

        const memberSubscription = await member.related('stripeSubscriptions').query({
            where: {
                subscription_id: subscription.id
            }
        }).fetchOne();

        if (!memberSubscription) {
            logging.info(`Ignoring customer.subscription.* event as member subscription does not exist`);
            return;
        }

        try {
            await memberRepository.linkSubscription({
                id: member.id,
                subscription
            });
        } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'SQLITE_CONSTRAINT') {
                throw err;
            }
            throw new errors.ConflictError({err});
        }
    }
};
