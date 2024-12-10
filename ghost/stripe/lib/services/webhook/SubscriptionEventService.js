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

        // During checkout, Stripe sends customer.subscription.created and customer.subscription.updated events before checkout.session.completed
        // We use the checkout.session.completed event to create a member and the related subscription in the database, as checkout.session.completed contains additional information on the subscription (e.g. attribution data)
        // Therefore, we ignore customer.subscription.* events until a member and its subscription are present in the database
        if (!member) {
            logging.info(`Ignoring customer.subscription.* event as member does not exist`);
            return;
        }

        const memberSubscriptions = await member.related('stripeSubscriptions').fetch();
        const memberSubscription = memberSubscriptions.models.find((sub) => {
            return sub.get('subscription_id') === subscription.id;
        });

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
