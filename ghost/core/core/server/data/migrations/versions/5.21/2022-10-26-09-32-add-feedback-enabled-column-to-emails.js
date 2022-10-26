const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'feedback_enabled', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
