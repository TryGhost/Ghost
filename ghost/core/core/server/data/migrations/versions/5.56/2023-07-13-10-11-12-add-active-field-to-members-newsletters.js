const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_newsletters', 'active', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
