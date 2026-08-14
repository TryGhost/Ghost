const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'enable_updates_and_announcements', {
    type: 'boolean',
    nullable: true
});
