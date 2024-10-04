const errors = require('@tryghost/errors');
const _ = require('lodash');
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

        if (member) {
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
    }
};
