const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'feedback_enabled', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
