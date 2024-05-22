const ghostBookshelf = require('./base');

const MemberNewsletter = ghostBookshelf.Model.extend({
    tableName: 'members_newsletters'
});

module.exports = {
    MemberNewsletter: ghostBookshelf.model('MemberNewsletter', MemberNewsletter)
};
