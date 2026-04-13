const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('email_design_settings', 'show_header_icon', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
