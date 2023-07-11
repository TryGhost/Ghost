const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'milestone_notifications', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
