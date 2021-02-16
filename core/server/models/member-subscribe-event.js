const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberSubscribeEvent = ghostBookshelf.Model.extend({
    tableName: 'members_subscribe_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    customQuery(qb, options) {
        if (options.aggregateSubscriptionDeltas) {
            if (options.limit || options.filter) {
                throw new errors.IncorrectUsageError('aggregateSubscriptionDeltas does not work when passed a filter or limit');
            }
            const knex = ghostBookshelf.knex;
            return qb.clear('select')
                .select(knex.raw(`DATE(created_at) as date`))
                .select(knex.raw(`SUM(CASE WHEN subscribed THEN 1 ELSE -1 END) as subscribed_delta`))
                .groupByRaw(`DATE(created_at)`)
                .orderByRaw(`DATE(created_at)`);
        }
    }
}, {
    permittedOptions(methodName) {
        const options = ghostBookshelf.Model.permittedOptions.call(this, methodName);

        if (methodName === 'findAll') {
            return options.concat('aggregateSubscriptionDeltas');
        }

        return options;
    },
    async edit() {
        throw new errors.IncorrectUsageError('Cannot edit MemberSubscribeEvent');
    },

    async destroy() {
        throw new errors.IncorrectUsageError('Cannot destroy MemberSubscribeEvent');
    }
});

const MemberSubscribeEvents = ghostBookshelf.Collection.extend({
    model: MemberSubscribeEvent
});

module.exports = {
    MemberSubscribeEvent: ghostBookshelf.model('MemberSubscribeEvent', MemberSubscribeEvent),
    MemberSubscribeEvents: ghostBookshelf.collection('MemberSubscribeEvents', MemberSubscribeEvents)
};
