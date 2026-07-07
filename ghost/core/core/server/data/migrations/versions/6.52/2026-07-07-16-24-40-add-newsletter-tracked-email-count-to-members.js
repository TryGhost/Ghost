const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'newsletter_tracked_email_count', {
    type: 'integer',
    unsigned: true,
    nullable: true
}, {algorithm: 'instant'});
