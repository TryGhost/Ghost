const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberFeedback = ghostBookshelf.Model.extend({
    tableName: 'members_feedback',
    
    post() {
        return this.belongsTo('Post', 'post_id', 'id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
}, {
    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberFeedback'});
    }
});

module.exports = {
    MemberFeedback: ghostBookshelf.model('MemberFeedback', MemberFeedback)
};
