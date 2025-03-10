const errors = require('@tryghost/errors');
const _ = require('lodash');

/**
 * Handles `customer.subscription.*` webhook events
 * 
 * The `customer.subscription.*` events are triggered when a customer's subscription status changes.
 * 
 * This service is responsible for handling these events and updating the subscription status in Ghost,
 * although it mostly delegates the responsibility to the `MemberRepository`.
 */
module.exports = class SubscriptionEventService {
    /**
     * @param {object} deps
     * @param {import('../../repositories/MemberRepository')} deps.memberRepository
     */
    constructor(deps) {
        this.deps = deps;
    }

    /**
     * Handles a `customer.subscription.*` event
     * 
     * Looks up the member by the Stripe customer ID and links the subscription to the member.
     * @param {import('stripe').Stripe.Subscription} subscription
     */
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
