module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

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

        /**
         * The status event recorded at member creation time (if any).
         * Should only ever match one row per batch_id today; orderBy makes the choice deterministic if not.
         */
        signupStatusEvent() {
            return this.belongsTo('MemberStatusEvent', 'batch_id', 'batch_id')
                .query(qb => qb.whereNull('from_status').orderBy('created_at', 'desc'));
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

    return {
        MemberCreatedEvent: ghostBookshelf.model('MemberCreatedEvent', MemberCreatedEvent)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
