const {addTable} = require('../../utils');

module.exports = addTable('members_newsletters', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    newsletter_id: {type: 'string', maxlength: 24, nullable: false, references: 'newsletters.id', cascadeDelete: true}
});
