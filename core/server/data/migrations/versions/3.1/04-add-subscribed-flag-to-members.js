const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'subscribed', {
    type: 'bool',
    nullable: true,
    defaultTo: true
});
