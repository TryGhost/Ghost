const ghostBookshelf = require('./base');

const MemberGift = ghostBookshelf.Model.extend({
    tableName: 'member_gifts'
});

module.exports = {
    MemberGift: ghostBookshelf.model('MemberGift', MemberGift)
};
