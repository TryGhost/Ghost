const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'feedback_enabled', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
