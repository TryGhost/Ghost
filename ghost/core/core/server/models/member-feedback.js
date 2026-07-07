module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

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

    return {
        MemberFeedback: ghostBookshelf.model('MemberFeedback', MemberFeedback)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
