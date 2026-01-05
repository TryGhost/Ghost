const ghostBookshelf = require('./base');

const MemberCommentBan = ghostBookshelf.Model.extend({
    tableName: 'members_comment_bans',

    actionsCollectCRUD: true,
    actionsResourceType: 'comment_ban',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    }
});

const MemberCommentBans = ghostBookshelf.Collection.extend({
    model: MemberCommentBan
});

module.exports = {
    MemberCommentBan: ghostBookshelf.model('MemberCommentBan', MemberCommentBan),
    MemberCommentBans: ghostBookshelf.collection('MemberCommentBans', MemberCommentBans)
};
