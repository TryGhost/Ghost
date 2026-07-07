module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

    const MemberLoginEvent = ghostBookshelf.Model.extend({
        tableName: 'members_login_events',

        member() {
            return this.belongsTo('Member', 'member_id', 'id');
        }
    }, {
        async edit() {
            throw new errors.IncorrectUsageError({message: 'Cannot edit MemberLoginEvent'});
        },

        async destroy() {
            throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberLoginEvent'});
        }
    });

    const MemberLoginEvents = ghostBookshelf.Collection.extend({
        model: MemberLoginEvent
    });

    return {
        MemberLoginEvent: ghostBookshelf.model('MemberLoginEvent', MemberLoginEvent),
        MemberLoginEvents: ghostBookshelf.collection('MemberLoginEvents', MemberLoginEvents)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
