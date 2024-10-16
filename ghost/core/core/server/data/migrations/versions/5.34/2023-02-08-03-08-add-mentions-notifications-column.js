const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'mention_notifications', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
