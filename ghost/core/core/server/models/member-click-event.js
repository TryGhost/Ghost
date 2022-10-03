const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberClickEvent = ghostBookshelf.Model.extend({
    tableName: 'members_click_events',

    link() {
        return this.belongsTo('Redirect', 'redirect_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberClickEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberClickEvent'});
    }
});

module.exports = {
    MemberClickEvent: ghostBookshelf.model('MemberClickEvent', MemberClickEvent)
};
