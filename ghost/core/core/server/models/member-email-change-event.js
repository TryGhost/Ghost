const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberEmailChangeEvent = ghostBookshelf.Model.extend({
    tableName: 'members_email_change_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberEmailChangeEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberEmailChangeEvent'});
    }
});

const MemberEmailChangeEvents = ghostBookshelf.Collection.extend({
    model: MemberEmailChangeEvent
});

module.exports = {
    MemberEmailChangeEvent: ghostBookshelf.model('MemberEmailChangeEvent', MemberEmailChangeEvent),
    MemberEmailChangeEvents: ghostBookshelf.collection('MemberEmailChangeEvents', MemberEmailChangeEvents)
};
