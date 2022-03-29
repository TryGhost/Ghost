const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberStatusEvent = ghostBookshelf.Model.extend({
    tableName: 'members_status_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    customQuery(qb, options) {
        if (options.aggregateStatusCounts) {
            if (options.limit || options.filter) {
                throw new errors.IncorrectUsageError({
                    message: 'aggregateStatusCounts does not work when passed a filter or limit'
                });
            }
            const knex = ghostBookshelf.knex;
            return qb.clear('select')
                .select(knex.raw('DATE(created_at) as date'))
                // @todo: we don't need the paid_delta in the future as we'll be able to calculate it by 
                // paid_delta = paid_subscribed - paid_canceled
                // It is here because we have a circular dependency with the members-api package (which we can only update when this code got merged into main)
                .select(knex.raw(`SUM(
                    CASE WHEN to_status='paid' THEN 1
                    WHEN from_status='paid' THEN -1
                    ELSE 0 END
                ) as paid_delta`))
                .select(knex.raw(`SUM(
                    CASE WHEN to_status='paid' THEN 1
                    ELSE 0 END
                ) as paid_subscribed`))
                .select(knex.raw(`SUM(
                    CASE WHEN from_status='paid' THEN 1
                    ELSE 0 END
                ) as paid_canceled`))
                .select(knex.raw(`SUM(
                    CASE WHEN to_status='comped' THEN 1
                    WHEN from_status='comped' THEN -1
                    ELSE 0 END
                ) as comped_delta`))
                .select(knex.raw(`SUM(
                    CASE WHEN to_status='free' THEN 1
                    WHEN from_status='free' THEN -1
                    ELSE 0 END
                ) as free_delta`))
                .groupByRaw('DATE(created_at)')
                .orderByRaw('DATE(created_at)');
        }
    }
}, {
    permittedOptions(methodName) {
        const options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        if (methodName === 'findAll') {
            return options.concat('aggregateStatusCounts');
        }

        return options;
    },
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberStatusEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberStatusEvent'});
    }
});

const MemberStatusEvents = ghostBookshelf.Collection.extend({
    model: MemberStatusEvent
});

module.exports = {
    MemberStatusEvent: ghostBookshelf.model('MemberStatusEvent', MemberStatusEvent),
    MemberStatusEvents: ghostBookshelf.collection('MemberStatusEvents', MemberStatusEvents)
};
