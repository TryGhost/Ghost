const ghostBookshelf = require('./base');

const MemberSubscribeEvent = ghostBookshelf.Model.extend({tableName: 'members_subscribe_events'}, {
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
