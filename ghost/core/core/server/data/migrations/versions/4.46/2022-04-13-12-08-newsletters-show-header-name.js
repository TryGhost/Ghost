const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_header_name', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
