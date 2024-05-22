const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'feedback_enabled', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
