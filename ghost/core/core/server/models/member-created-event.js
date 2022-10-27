const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberCreatedEvent = ghostBookshelf.Model.extend({
    tableName: 'members_created_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    /**
     * The subscription created event that happend at the same time (if any)
     */
    subscriptionCreatedEvent() {
        return this.belongsTo('SubscriptionCreatedEvent', 'batch_id', 'batch_id');
    },

    postAttribution() {
        return this.belongsTo('Post', 'attribution_id', 'id');   
    },

    userAttribution() {
        return this.belongsTo('User', 'attribution_id', 'id');   
    },

    tagAttribution() {
        return this.belongsTo('Tag', 'attribution_id', 'id');   
    },
    
    filterRelations() {
        return {
            subscriptionCreatedEvent: {
                // Mongo-knex doesn't support belongsTo relations
                tableName: 'members_subscription_created_events',
                tableNameAs: 'subscriptionCreatedEvent',
                type: 'manyToMany',
                joinTable: 'members_created_events',
                joinFrom: 'id',
                joinToForeign: 'batch_id',
                joinTo: 'batch_id',
                joinType: 'leftJoin'
            }
        };
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberCreatedEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberCreatedEvent'});
    }
});

module.exports = {
    MemberCreatedEvent: ghostBookshelf.model('MemberCreatedEvent', MemberCreatedEvent)
};
