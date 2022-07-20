const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberCancelEvent = ghostBookshelf.Model.extend({
    tableName: 'members_cancel_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberCancelEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberCancelEvent'});
    }
});

const MemberCancelEvents = ghostBookshelf.Collection.extend({
    model: MemberCancelEvent
});

module.exports = {
    MemberCancelEvent: ghostBookshelf.model('MemberCancelEvent', MemberCancelEvent),
    MemberCancelEvents: ghostBookshelf.collection('MemberCancelEvents', MemberCancelEvents)
};

