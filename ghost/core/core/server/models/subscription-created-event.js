const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const SubscriptionCreatedEvent = ghostBookshelf.Model.extend({
    tableName: 'members_subscription_created_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    /**
     * The member created event that happend at the same time (if any)
     */
    memberCreatedEvent() {
        return this.belongsTo('MemberCreatedEvent', 'batch_id', 'batch_id');
    },

    subscription() {
        return this.belongsTo('StripeCustomerSubscription', 'subscription_id', 'id');
    },

    postAttribution() {
        return this.belongsTo('Post', 'attribution_id', 'id');   
    },

    userAttribution() {
        return this.belongsTo('User', 'attribution_id', 'id');   
    },

    tagAttribution() {
        return this.belongsTo('Tag', 'attribution_id', 'id');   
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit SubscriptionCreatedEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy SubscriptionCreatedEvent'});
    }
});

module.exports = {
    SubscriptionCreatedEvent: ghostBookshelf.model('SubscriptionCreatedEvent', SubscriptionCreatedEvent)
};
