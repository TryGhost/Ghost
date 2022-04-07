const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('newsletters', 'default', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
