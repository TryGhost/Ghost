const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('integrations', 'type', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'custom'
});
