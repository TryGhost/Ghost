const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('gifts', 'consumes_soon_reminder_sent_at', {
    type: 'dateTime',
    nullable: true
});
