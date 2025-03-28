const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_subscribe_events', 'newsletter_id', {
    type: 'string', 
    maxlength: 24,
    nullable: true,
    references: 'newsletters.id', 
    cascadeDelete: false
});
