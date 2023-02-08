const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'mention_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
