const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'can_comment', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
