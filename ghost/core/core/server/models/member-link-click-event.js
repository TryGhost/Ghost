const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberLinkClickEvent = ghostBookshelf.Model.extend({
    tableName: 'members_link_click_events',

    link() {
        return this.belongsTo('LinkRedirect', 'link_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberLinkClickEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberLinkClickEvent'});
    }
});

module.exports = {
    MemberLinkClickEvent: ghostBookshelf.model('MemberLinkClickEvent', MemberLinkClickEvent)
};
