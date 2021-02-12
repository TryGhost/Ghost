const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberStatusEvent = ghostBookshelf.Model.extend({
    tableName: 'members_status_events',
    customQuery(qb, options) {
        if (options.aggregateStatusCounts) {
            if (options.limit || options.filter) {
                throw new errors.IncorrectUsageError('aggregateStatusCounts does not work when passed a filter or limit');
            }
            const knex = ghostBookshelf.knex;
            return qb.clear('select')
                .select(knex.raw('DATE(created_at) as date'))
                .select(knex.raw(`SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_delta`))
                .select(knex.raw(`SUM(CASE WHEN status='comped' THEN 1 ELSE 0 END) as comped_delta`))
                .select(knex.raw(`SUM(CASE WHEN status='free' THEN 1 ELSE 0 END) as free_delta`))
                .groupByRaw('DATE(created_at)')
                .orderByRaw('DATE(created_at)');
        }
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError('Cannot edit MemberStatusEvent');
    },

    async destroy() {
        throw new errors.IncorrectUsageError('Cannot destroy MemberStatusEvent');
    }
});

const MemberStatusEvents = ghostBookshelf.Collection.extend({
    model: MemberStatusEvent
});

module.exports = {
    MemberStatusEvent: ghostBookshelf.model('MemberStatusEvent', MemberStatusEvent),
    MemberStatusEvents: ghostBookshelf.collection('MemberStatusEvents', MemberStatusEvents)
};
