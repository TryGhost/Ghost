module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

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

    return {
        MemberCancelEvent: ghostBookshelf.model('MemberCancelEvent', MemberCancelEvent),
        MemberCancelEvents: ghostBookshelf.collection('MemberCancelEvents', MemberCancelEvents)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
