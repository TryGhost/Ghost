const ghostBookshelf = require('./base');
const uuid = require('uuid');

const MemberNewsletter = ghostBookshelf.Model.extend({
    tableName: 'members_newsletters',

    defaults() {
        return {
            id: uuid.v4(),
            member_id: null,
            newsletter_id: null
        };
    }
});

module.exports = {
    MemberNewsletter: ghostBookshelf.model('MemberNewsletter', MemberNewsletter)
};
