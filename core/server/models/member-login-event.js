const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberLoginEvent = ghostBookshelf.Model.extend({
    tableName: 'members_login_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError('Cannot edit MemberLoginEvent');
    },

    async destroy() {
        throw new errors.IncorrectUsageError('Cannot destroy MemberLoginEvent');
    }
});

const MemberLoginEvents = ghostBookshelf.Collection.extend({
    model: MemberLoginEvent
});

module.exports = {
    MemberLoginEvent: ghostBookshelf.model('MemberLoginEvent', MemberLoginEvent),
    MemberLoginEvents: ghostBookshelf.collection('MemberLoginEvents', MemberLoginEvents)
};

