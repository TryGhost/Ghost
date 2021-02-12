const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberStatusEvent = ghostBookshelf.Model.extend({
    tableName: 'members_status_events'
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
